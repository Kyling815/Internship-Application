import torch
from sentence_transformers import CrossEncoder

MODEL_PATH = r".\models\qwen3-reranker-0.6b"

def label_from_score(score: float) -> str:
    if score >= 0.80:
        return "strong_fit"
    if score >= 0.65:
        return "moderate_fit"
    if score >= 0.50:
        return "weak_fit"
    return "poor_fit"

def main():
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print("device:", device)
    if torch.cuda.is_available():
        print("gpu:", torch.cuda.get_device_name(0))

    model = CrossEncoder(
        MODEL_PATH,
        prompts={
            "cv_job_match": (
                "Judge whether the candidate CV text is semantically relevant "
                "and suitable for the job description. Consider role fit, skills, "
                "projects, experience, education, and transferable evidence. "
                "Do not rely only on exact keyword overlap."
            )
        },
        default_prompt_name="cv_job_match",
        device=device,
    )

    job_text = """
    [JOB DESCRIPTION]
    Title: Backend Intern

    Responsibilities:
    - Develop backend APIs for web applications.
    - Work with relational databases.
    - Support file upload and document management features.

    Requirements:
    - Python or Node.js
    - REST API development
    - SQL database
    - Git

    Preferred:
    - FastAPI
    - Docker
    - AWS S3
    """

    cv_sections = {
        "summary": "Computer science student building education web applications and backend systems.",
        "skills": "Python, FastAPI, MySQL, Git, REST API, basic AWS knowledge.",
        "projects": "Built an education LMS backend using FastAPI and MySQL. Implemented exam management, document upload, authentication, and OCR workflow.",
        "experience": "No formal company internship yet. Main experience comes from personal and school projects.",
        "education": "Undergraduate student in software engineering / computer science.",
        "certificates": "Learning AWS fundamentals."
    }

    full_cv = "\n\n".join(
        f"[CV SECTION: {name.upper()}]\n{text.strip()}"
        for name, text in cv_sections.items()
    )

    pairs = [("overall", job_text, full_cv)]
    for section_name, section_text in cv_sections.items():
        pairs.append((
            f"section_{section_name}",
            job_text,
            f"[CV SECTION: {section_name.upper()}]\n{section_text.strip()}"
        ))

    scores = model.predict(
        [(query, document) for _, query, document in pairs],
        activation_fn=torch.nn.Sigmoid()
    )

    result = {}
    for (pair_id, _, _), score in zip(pairs, scores):
        result[pair_id] = float(score)

    section_scores = {
        key.replace("section_", ""): value
        for key, value in result.items()
        if key.startswith("section_")
    }

    top_sections = sorted(section_scores.items(), key=lambda x: x[1], reverse=True)

    overall_score = result["overall"]
    top2_avg = sum(score for _, score in top_sections[:2]) / max(len(top_sections[:2]), 1)
    final_score = 0.70 * overall_score + 0.30 * top2_avg

    print("\nRaw scores:")
    for key, value in result.items():
        print(f"{key:24s}: {value:.4f}")

    print("\nFinal:")
    print("final_score:", round(final_score * 100))
    print("label:", label_from_score(final_score))
    print("best_sections:", [name for name, _ in top_sections[:2]])
    print("weak_sections:", [name for name, score in top_sections if score < 0.50])

if __name__ == "__main__":
    main()
