import pandas as pd

from process_resumes import process_resumes
from process_job_descriptions import process_job_descriptions
from score_candidates import score_candidates
from display_ui import display_ui

folder_containing_resumes = "./resumes"
folder_containing_job_descriptions = "./job_descriptions"

def start_processing():
    processed_resumes_file = process_resumes(folder_containing_resumes)
    if not processed_resumes_file:
        print("No resumes processed")
        return
    processed_job_descriptions_file = process_job_descriptions(
        folder_containing_job_descriptions
    )
    if not processed_job_descriptions_file:
        print("No job descriptions processed")
        return

    # Read the CSV file
    df = pd.read_csv(
        processed_job_descriptions_file
        # "./output/POMVOM_JD.csv" # For testing only
    )

    # Iterate through each job description
    for index, row in df.iterrows():
        job_data = row.to_dict()
        score_candidates(
            job_data,
            processed_resumes_file,
            # "output/perfect_candidates_pomvom.csv", # For testing only
        )
    
def main():
    display_ui(start_processing)


if __name__ == "__main__":
    main()
