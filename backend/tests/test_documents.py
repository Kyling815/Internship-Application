from pathlib import Path

from app.db import models
from app.db.database import SessionLocal


def auth_headers(client, email="docs@example.edu"):
    client.post(
        "/auth/register",
        json={
            "email": email,
            "full_name": "Document Tester",
            "password": "password123",
        },
    )
    response = client.post(
        "/auth/login",
        json={"email": email, "password": "password123"},
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def create_application(client, headers):
    response = client.post(
        "/applications",
        json={
            "company_name": "CloudCo",
            "position_title": "Cloud Intern",
            "job_description": "Python FastAPI AWS S3 Docker internship.",
            "application_status": "Saved",
            "deadline": None,
            "notes": None,
        },
        headers=headers,
    )
    assert response.status_code == 201
    return response.json()


def upload_document(client, application_id, headers, filename="cv.txt", content=b"Python AWS S3"):
    return client.post(
        f"/applications/{application_id}/documents",
        data={"document_type": "CV"},
        files={"file": (filename, content, "text/plain")},
        headers=headers,
    )


def test_upload_list_download_url_and_delete_document(client):
    headers = auth_headers(client)
    application = create_application(client, headers)

    upload_response = upload_document(client, application["id"], headers)
    assert upload_response.status_code == 201
    document = upload_response.json()
    assert document["document_type"] == "CV"

    with SessionLocal() as db:
        stored_document = db.get(models.Document, document["id"])
        assert stored_document is not None
        assert stored_document.s3_key
        assert stored_document.file_url.startswith("/uploads/")
        stored_path = Path(".test_uploads") / stored_document.s3_key

    assert stored_path.exists()

    list_response = client.get(
        f"/applications/{application['id']}/documents",
        headers=headers,
    )
    assert list_response.status_code == 200
    assert len(list_response.json()) == 1

    download_response = client.get(
        f"/documents/{document['id']}/download-url",
        headers=headers,
    )
    assert download_response.status_code == 200
    download_payload = download_response.json()
    assert download_payload["document_id"] == document["id"]
    assert download_payload["download_url"].startswith("/uploads/")

    delete_response = client.delete(f"/documents/{document['id']}", headers=headers)
    assert delete_response.status_code == 200
    assert not stored_path.exists()

    list_after_delete = client.get(
        f"/applications/{application['id']}/documents",
        headers=headers,
    )
    assert list_after_delete.status_code == 200
    assert list_after_delete.json() == []


def test_candidate_direct_document_upload_creates_reusable_document(client):
    headers = auth_headers(client)

    upload_response = client.post(
        "/candidate/documents",
        data={"document_type": "CV"},
        files={"file": ("direct_cv.txt", b"Python FastAPI AWS", "text/plain")},
        headers=headers,
    )

    assert upload_response.status_code == 201
    document = upload_response.json()
    assert document["document_type"] == "CV"
    assert document["file_name"] == "direct_cv.txt"
    assert document["application_id"]

    applications_response = client.get("/applications", headers=headers)
    assert applications_response.status_code == 200
    assert applications_response.json() == []

    update_response = client.put(
        f"/applications/{document['application_id']}",
        json={
            "company_name": "Edited",
            "position_title": "Edited",
            "job_description": "Edited",
        },
        headers=headers,
    )
    assert update_response.status_code == 400

    delete_response = client.delete(
        f"/applications/{document['application_id']}",
        headers=headers,
    )
    assert delete_response.status_code == 400

    list_response = client.get("/candidate/documents", headers=headers)
    assert list_response.status_code == 200
    assert list_response.json()[0]["id"] == document["id"]


def test_document_upload_rejects_invalid_type_and_extension(client):
    headers = auth_headers(client)
    application = create_application(client, headers)

    invalid_type_response = client.post(
        f"/applications/{application['id']}/documents",
        data={"document_type": "Resume"},
        files={"file": ("cv.txt", b"Python AWS", "text/plain")},
        headers=headers,
    )
    assert invalid_type_response.status_code == 400

    invalid_extension_response = client.post(
        f"/applications/{application['id']}/documents",
        data={"document_type": "CV"},
        files={"file": ("cv.exe", b"not allowed", "application/octet-stream")},
        headers=headers,
    )
    assert invalid_extension_response.status_code == 400


def test_document_routes_reject_cross_user_access(client):
    owner_headers = auth_headers(client, "owner@example.edu")
    application = create_application(client, owner_headers)
    upload_response = upload_document(client, application["id"], owner_headers)
    assert upload_response.status_code == 201
    document = upload_response.json()

    other_headers = auth_headers(client, "other@example.edu")

    list_response = client.get(
        f"/applications/{application['id']}/documents",
        headers=other_headers,
    )
    assert list_response.status_code == 403

    download_response = client.get(
        f"/documents/{document['id']}/download-url",
        headers=other_headers,
    )
    assert download_response.status_code == 403

    delete_response = client.delete(
        f"/documents/{document['id']}",
        headers=other_headers,
    )
    assert delete_response.status_code == 403
