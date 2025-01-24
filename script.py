import pandas as pd

from process_resumes import process_resumes
from process_job_descriptions import process_job_descriptions
from score_candidates import score_candidates

folder_containing_pdfs = "./resumes"
folder_containing_job_descriptions = "./job_descriptions"


def main():
    # processed_resumes_file = process_resumes(folder_containing_pdfs)
    # if not processed_resumes_file:
    #     print("No resumes processed")
    #     return
    processed_job_descriptions_file = process_job_descriptions(
        folder_containing_job_descriptions
    )
    if not processed_job_descriptions_file:
        print("No job descriptions processed")
        return

    # Read the CSV file
    df = pd.read_csv(
        processed_job_descriptions_file
        # "./output/job_descriptions_20250124_090816.csv"
    )

    # Iterate through each job description
    for index, row in df.iterrows():
        # if index == 0: # For testing, limit to first job description
        job_data = row.to_dict()
        score_candidates(
            job_data, "output/resumes_20250124_093803.csv"
        )  # TODO: use processed_resumes_file


if __name__ == "__main__":
    main()
