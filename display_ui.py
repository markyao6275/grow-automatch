import os
import sys
import shutil
from PyQt6.QtWidgets import QWidget, QVBoxLayout, QLabel, QPushButton, QLineEdit, QFileDialog, QMessageBox, QHBoxLayout, QFrame, QSpacerItem, QSizePolicy
from PyQt6.QtGui import QIcon, QPixmap, QFont, QFontDatabase
from PyQt6.QtCore import Qt

def resource_path(relative_path):
    """Get the absolute path to a resource, works for both development and PyInstaller."""
    if hasattr(sys, "_MEIPASS"):
        # If running as a PyInstaller bundle
        return os.path.join(sys._MEIPASS, relative_path)
    return os.path.join(os.path.abspath("."), relative_path)

class DisplayUI(QWidget):
    def __init__(self, start_processing_callback):
        super().__init__()

        logo_path = resource_path("assets/grow_logo.png")
        bg_path = resource_path("assets/grow_bg.jpeg")
        icon_path = resource_path("assets/grow.ico")
        font_path = resource_path("assets/fonts/RussoOne-Regular.ttf")

         # Load Russo One font
        font_id = QFontDatabase.addApplicationFont(font_path)
        if font_id != -1:
            font_family = QFontDatabase.applicationFontFamilies(font_id)[0]
            self.setFont(QFont(font_family, 12))  # Set font for this widget and its children
        else:
            print("Failed to load Russo One font.")

        # Ensure necessary directories exist
        os.makedirs("resumes", exist_ok=True)
        os.makedirs("job_descriptions", exist_ok=True)

        self.start_processing = start_processing_callback

        self.setWindowTitle("Grow Match")
        self.setGeometry(100, 100, 600, 400)
        self.setWindowIcon(QIcon(icon_path))  # Ensure the path to grow.ico is correct

        # Set background image using QLabel
        self.bg_label = QLabel(self)
        self.bg_pixmap = QPixmap(bg_path)
        self.bg_label.setPixmap(self.bg_pixmap.scaled(self.size(), Qt.AspectRatioMode.KeepAspectRatioByExpanding))
        self.bg_label.setGeometry(self.rect())  # Cover the entire window
        self.bg_label.lower()  # Send background label to the bottom
        
        # Load logo image (Ensure assets folder exists with the correct image)
        try:
            logo_pixmap = QPixmap(logo_path)
            logo_label = QLabel(self)
            logo_label.setPixmap(logo_pixmap.scaled(100, 30, Qt.AspectRatioMode.KeepAspectRatio))
            logo_label.setAlignment(Qt.AlignmentFlag.AlignLeft)
        except FileNotFoundError:
            QMessageBox.critical(self, "Error", "Logo file not found in the assets folder.")

        # Top-right label for "Grow Automatch"
        grow_label = QLabel("Grow Automatch", self)
        grow_label.setFont(QFont("Russo One", 18))  # Increase font size for "Grow Automatch"
        grow_label.setAlignment(Qt.AlignmentFlag.AlignRight)

        # Main Layout
        main_layout = QVBoxLayout(self)

        # Top layout for logo and "Grow Automatch"
        top_layout = QHBoxLayout()
        top_layout.addWidget(logo_label)
        top_layout.addWidget(grow_label)
        top_layout.setContentsMargins(10, 10, 10, 10)  # Add margins
        top_layout.setSpacing(5)  # Decrease spacing between the logo and "Grow Automatch"
        main_layout.addLayout(top_layout)

        # Spacer between the top layout and the input fields
        spacer_top = QSpacerItem(20, 40, QSizePolicy.Policy.Minimum, QSizePolicy.Policy.Expanding)
        main_layout.addItem(spacer_top)

        # Create a container for the browse inputs and layout them properly
        input_container = QVBoxLayout()

        # Resume Frame Layout
        self.resume_frame = QFrame(self)
        self.resume_layout = QVBoxLayout(self.resume_frame)
        self.resume_label = QLabel("Resumes:", self.resume_frame)
        self.resume_label.setFont(QFont("Russo One", 12))  # Increase font size for labels
        self.resume_layout.addWidget(self.resume_label)

        self.resume_input_layout = QHBoxLayout()
        self.resume_entry = QLineEdit(self.resume_frame)
        self.resume_entry.setDisabled(True)
        self.resume_entry.setStyleSheet("background-color: #f0f0f0; padding: 7px; color: black;")
        self.resume_input_layout.addWidget(self.resume_entry)

        self.browse_resume_button = QPushButton("Browse", self.resume_frame)
        self.browse_resume_button.setStyleSheet("background-color: white; color: black; padding: 7px 15px; font-size: 16px;")
        self.browse_resume_button.setFont(QFont("Russo One", 12))  # Apply Russo One font and size 12
        self.browse_resume_button.clicked.connect(self.browse_resumes)
        self.resume_input_layout.addWidget(self.browse_resume_button)

        self.resume_layout.addLayout(self.resume_input_layout)
        input_container.addWidget(self.resume_frame)

        # Job Description Frame Layout
        self.job_desc_frame = QFrame(self)
        self.job_desc_layout = QVBoxLayout(self.job_desc_frame)
        self.job_desc_label = QLabel("Job Descriptions:", self.job_desc_frame)
        self.job_desc_label.setFont(QFont("Russo One", 12))  # Increase font size for labels
        self.job_desc_layout.addWidget(self.job_desc_label)

        self.job_desc_input_layout = QHBoxLayout()
        self.job_desc_entry = QLineEdit(self.job_desc_frame)
        self.job_desc_entry.setDisabled(True)
        self.job_desc_entry.setStyleSheet("background-color: #f0f0f0; padding: 7px; color: black;")
        self.job_desc_input_layout.addWidget(self.job_desc_entry)

        self.browse_job_desc_button = QPushButton("Browse", self.job_desc_frame)
        self.browse_job_desc_button.setStyleSheet("background-color: white; color: black; padding: 7px 15px; font-size: 16px;")
        self.browse_job_desc_button.setFont(QFont("Russo One", 12))  # Apply Russo One font and size 12
        self.browse_job_desc_button.clicked.connect(self.browse_job_descriptions)
        self.job_desc_input_layout.addWidget(self.browse_job_desc_button)

        self.job_desc_layout.addLayout(self.job_desc_input_layout)
        input_container.addWidget(self.job_desc_frame)

        # Add the input container to the main layout
        main_layout.addLayout(input_container)

        # Spacer between the input fields and the submit button
        spacer_bottom = QSpacerItem(20, 40, QSizePolicy.Policy.Minimum, QSizePolicy.Policy.Expanding)
        main_layout.addItem(spacer_bottom)

        # Submit Button
        self.submit_button = QPushButton("Start", self)
        self.submit_button.setStyleSheet("background-color: #0074FF; color: white; padding: 10px 20px; font-size: 16px;")  # Submit button color
        self.submit_button.setFont(QFont("Russo One", 14))  # Apply Russo One font and size 14
        self.submit_button.clicked.connect(self.submit_action)
        main_layout.addWidget(self.submit_button)

        # Set the main layout
        self.setLayout(main_layout)

    def browse_resumes(self):
        files, _ = QFileDialog.getOpenFileNames(self, "Select Resumes", "", "PDF Files (*.pdf)")
        if files:
            self.resume_files = files
            self.resume_entry.setEnabled(True)
            self.resume_entry.setText(f"{len(files)} file(s) selected")
            self.resume_entry.setDisabled(True)

    def browse_job_descriptions(self):
        files, _ = QFileDialog.getOpenFileNames(self, "Select Job Descriptions", "", "PDF Files (*.pdf)")
        if files:
            self.job_desc_files = files
            self.job_desc_entry.setEnabled(True)
            self.job_desc_entry.setText(f"{len(files)} file(s) selected")
            self.job_desc_entry.setDisabled(True)

    def delete_all_uploaded_files(self):
        try:
            for folder in ["resumes", "job_descriptions"]:
                for file in os.listdir(folder):
                    file_path = os.path.join(folder, file)
                    if os.path.isfile(file_path):
                        os.remove(file_path)
        except Exception as e:
            QMessageBox.critical(self, "Error", f"Failed to delete files: {str(e)}")

    def submit_action(self):
        if not self.resume_files:
            QMessageBox.critical(self, "Error", "Please select resumes.")
            return
        if not self.job_desc_files:
            QMessageBox.critical(self, "Error", "Please select job descriptions.")
            return

        self.submit_button.setEnabled(False)
        self.submit_button.setText("Processing...")

        try:
            # Save resumes to /resumes folder
            for file in self.resume_files:
                shutil.copy(file, "resumes")
            # Save job descriptions to /job_descriptions folder
            for file in self.job_desc_files:
                shutil.copy(file, "job_descriptions")
            QMessageBox.information(self, "Processing", "Processing resumes and job descriptions. This may take a while.")
            self.start_processing()
            self.delete_all_uploaded_files()
            QMessageBox.information(self, "Success", "Processing complete. Please check the output folder for results.")

        except Exception as e:
            QMessageBox.critical(self, "Error", f"An error occurred: {str(e)}")
        finally:
            self.submit_button.setEnabled(True)
            self.submit_button.setText("Start")
