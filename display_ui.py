from tkinter import *
from tkinter import messagebox
import customtkinter as ctk
from PIL import Image
from tkinter import filedialog
import os
import shutil

def display_ui(start_processing):
    
    # Ensure necessary directories exist
    os.makedirs("resumes", exist_ok=True)
    os.makedirs("job_descriptions", exist_ok=True)

    ctk.set_appearance_mode("dark")
    ctk.set_default_color_theme("dark-blue")

    button_color = "#0074FF"

    # Create the main window
    root = ctk.CTk()
    root.geometry("600x400")
    root.title("Grow Match")
    root.iconbitmap("assets/grow.ico")  # Ensure the path to grow.ico is correct
    root.resizable(False, False)

    # Load logo image (Ensure assets folder exists with the correct image)
    try:
        logo = ctk.CTkImage(light_image=Image.open("assets/grow_logo.png"), 
                            dark_image=Image.open("assets/grow_logo.png"), 
                            size=(100, 30))
        image_label = ctk.CTkLabel(root, text="", image=logo)
        image_label.place(relx=0.5, rely=0.125, anchor="center")
    except FileNotFoundError:
        messagebox.showerror("Error", "Logo file not found in the assets folder.")

    # Frame for Resume input
    resume_frame = ctk.CTkFrame(root)
    resume_frame.place(relx=0.5, rely=0.35, anchor="center")

    label1 = ctk.CTkLabel(resume_frame, text="Resumes:", text_color="white")
    label1.grid(row=0, column=0, sticky="w", padx=10, pady=5)

    resume_entry = ctk.CTkEntry(resume_frame, width=200, border_color="gray")
    resume_entry.grid(row=1, column=0, padx=10, pady=5)
    resume_entry.configure(state="disabled")

    resume_files = []

    def browse_resumes():
        nonlocal resume_files
        files = filedialog.askopenfilenames(filetypes=[("PDF Files", "*.pdf")])
        if files:
            resume_files = files
            resume_entry.configure(state="normal")
            resume_entry.delete(0, END)
            resume_entry.insert(0, f"{len(files)} file(s) selected")
            resume_entry.configure(state="disabled")

    browse_resume_button = ctk.CTkButton(resume_frame, text="Browse", width=80, 
                                         command=browse_resumes, fg_color=button_color)
    browse_resume_button.grid(row=1, column=1, padx=10, pady=5)

    # Frame for Job Description input
    job_desc_frame = ctk.CTkFrame(root)
    job_desc_frame.place(relx=0.5, rely=0.55, anchor="center")

    label2 = ctk.CTkLabel(job_desc_frame, text="Job Descriptions:", text_color="white")
    label2.grid(row=0, column=0, sticky="w", padx=10, pady=5)

    job_desc_entry = ctk.CTkEntry(job_desc_frame, width=200, border_color="gray")
    job_desc_entry.grid(row=1, column=0, padx=10, pady=5)
    job_desc_entry.configure(state="disabled")

    job_desc_files = []

    def browse_job_descriptions():
        nonlocal job_desc_files
        files = filedialog.askopenfilenames(filetypes=[("PDF Files", "*.pdf")])
        if files:
            job_desc_files = files
            job_desc_entry.configure(state="normal")
            job_desc_entry.delete(0, END)
            job_desc_entry.insert(0, f"{len(files)} file(s) selected")
            job_desc_entry.configure(state="disabled")

    browse_job_desc_button = ctk.CTkButton(job_desc_frame, text="Browse", width=80, 
                                           command=browse_job_descriptions, fg_color=button_color)
    browse_job_desc_button.grid(row=1, column=1, padx=10, pady=5)

    # Function to delete all uploaded files
    def delete_all_uploaded_files():
        try:
            for folder in ["resumes", "job_descriptions"]:
                for file in os.listdir(folder):
                    file_path = os.path.join(folder, file)
                    if os.path.isfile(file_path):
                        os.remove(file_path)
        except Exception as e:
            messagebox.showerror("Error", f"Failed to delete files: {str(e)}")

    # Submit button
    def submit_action():
        if not resume_files:
            messagebox.showerror("Error", "Please select resumes.")
            return
        if not job_desc_files:
            messagebox.showerror("Error", "Please select job descriptions.")
            return

        submit_button.configure(state="disabled", text="Processing...")

        try:
            # Save resumes to /resumes folder
            for file in resume_files:
                shutil.copy(file, "resumes")
            # Save job descriptions to /job_descriptions folder
            for file in job_desc_files:
                shutil.copy(file, "job_descriptions")           
            messagebox.showinfo("Processing", "Processing resumes and job descriptions. This may take a while.")
            start_processing()
            delete_all_uploaded_files()
            messagebox.showinfo("Success", "Processing complete. Please check the output folder for results.")

        except Exception as e:
            messagebox.showerror("Error", f"An error occurred: {str(e)}")
        finally:
            submit_button.configure(state="normal", text="Submit")   

    submit_button = ctk.CTkButton(root, text="Submit", width=200, command=submit_action, 
                                  fg_color=button_color)
    submit_button.place(relx=0.5, rely=0.8, anchor="center")

    root.mainloop()
