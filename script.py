from process_resumes import process_resumes
from process_job_descriptions import process_job_descriptions
from score_candidates import score_candidates


def main():
    # folder_containing_pdfs = "./resumes"
    # process_resumes(folder_containing_pdfs)

    # folder_containing_job_descriptions = "./job_descriptions"
    # process_job_descriptions(folder_containing_job_descriptions)

    folder_containing_candidates = "./output/candidates"
    score_candidates(folder_containing_candidates)


if __name__ == "__main__":
    main()
