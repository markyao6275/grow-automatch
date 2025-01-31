import config
import os
import sys
import shutil
from PyQt6.QtWidgets import (
    QWidget,
    QVBoxLayout,
    QLabel,
    QPushButton,
    QLineEdit,
    QFileDialog,
    QMessageBox,
    QHBoxLayout,
    QFrame,
    QSpacerItem,
    QSizePolicy,
    QApplication,
    QSpinBox,
)
from PyQt6.QtGui import QIcon, QPixmap, QFont, QFontDatabase
from PyQt6.QtCore import Qt


def resource_path(relative_path):
    if hasattr(sys, "_MEIPASS"):
        return os.path.join(sys._MEIPASS, relative_path)
    return os.path.join(os.path.abspath("."), relative_path)


class DisplayUI(QWidget):
    def __init__(self, start_processing_callback):
        super().__init__()

        self.start_processing = start_processing_callback

        logo_path = resource_path("assets/grow_logo.png")
        bg_path = resource_path("assets/grow_bg.jpeg")
        icon_path = resource_path("assets/grow.ico")
        font_path = resource_path("assets/fonts/RussoOne-Regular.ttf")

        font_id = QFontDatabase.addApplicationFont(font_path)
        if font_id != -1:
            font_family = QFontDatabase.applicationFontFamilies(font_id)[0]
            self.setFont(QFont(font_family, 12))
        else:
            print("Failed to load Russo One font.")

        os.makedirs("resumes", exist_ok=True)
        os.makedirs("job_descriptions", exist_ok=True)

        self.setWindowTitle("Grow Match")
        self.setGeometry(100, 100, 600, 400)
        self.setWindowIcon(QIcon(icon_path))
        self.bg_label = QLabel(self)
        self.bg_pixmap = QPixmap(bg_path)
        self.bg_label.setPixmap(
            self.bg_pixmap.scaled(
                self.size(), Qt.AspectRatioMode.KeepAspectRatioByExpanding
            )
        )
        self.bg_label.setGeometry(self.rect())
        self.bg_label.lower()

        try:
            logo_pixmap = QPixmap(logo_path)
            logo_label = QLabel(self)
            logo_label.setPixmap(
                logo_pixmap.scaled(100, 30, Qt.AspectRatioMode.KeepAspectRatio)
            )
            logo_label.setAlignment(Qt.AlignmentFlag.AlignLeft)
        except FileNotFoundError:
            QMessageBox.critical(
                self, "Error", "Logo file not found in the assets folder."
            )

        grow_label = QLabel("Grow Automatch", self)
        grow_label.setFont(QFont("Russo One", 18))
        grow_label.setAlignment(Qt.AlignmentFlag.AlignRight)

        main_layout = QVBoxLayout(self)

        top_layout = QHBoxLayout()
        top_layout.addWidget(logo_label)
        top_layout.addWidget(grow_label)
        top_layout.setContentsMargins(10, 10, 10, 10)
        top_layout.setSpacing(5)
        main_layout.addLayout(top_layout)

        spacer_top = QSpacerItem(
            20, 40, QSizePolicy.Policy.Minimum, QSizePolicy.Policy.Expanding
        )
        main_layout.addItem(spacer_top)

        input_container = QVBoxLayout()

        input_style = """
            background-color: rgba(0, 20, 46, 0.6);
            color: #e7e7e7;
            font-size: 14px;
            padding: 5px;
            height: 25px;
            min-width: 200px;
            border: 1px solid gray;
            border-radius: 5px;
        """

        button_style = """
            QPushButton {
                background-color: #e7e7e7;
                color: #00142E;
                font-size: 15px;
                padding: 5px 10px;
                height: 25px;
                min-width: 100px;
                border-radius: 5px;
            }
            QPushButton:hover {
                border: 1px solid #006DEF;
            }
        """

        # Resume Frame Layout
        self.resume_frame = QFrame(self)
        self.resume_layout = QVBoxLayout(self.resume_frame)
        self.resume_label = QLabel("Resumes:", self.resume_frame)
        self.resume_label.setFont(QFont("Russo One", 12))
        self.resume_layout.addWidget(self.resume_label)

        self.resume_input_layout = QHBoxLayout()
        self.resume_entry = QLineEdit(self.resume_frame)
        self.resume_entry.setDisabled(True)
        self.resume_entry.setStyleSheet(input_style)
        self.resume_entry.setPlaceholderText("Upload Resume")
        self.resume_input_layout.addWidget(self.resume_entry)

        self.browse_resume_button = QPushButton("Browse", self.resume_frame)
        self.browse_resume_button.setStyleSheet(button_style)
        self.browse_resume_button.setFont(QFont("Russo One", 12))
        self.browse_resume_button.clicked.connect(self.browse_resumes)
        self.resume_input_layout.addWidget(self.browse_resume_button)

        self.resume_layout.addLayout(self.resume_input_layout)
        input_container.addWidget(self.resume_frame)

        # Job Description Frame Layout
        self.job_desc_frame = QFrame(self)
        self.job_desc_layout = QVBoxLayout(self.job_desc_frame)
        self.job_desc_label = QLabel("Job Descriptions:", self.job_desc_frame)
        self.job_desc_label.setFont(QFont("Russo One", 12))
        self.job_desc_layout.addWidget(self.job_desc_label)

        self.job_desc_input_layout = QHBoxLayout()
        self.job_desc_entry = QLineEdit(self.job_desc_frame)
        self.job_desc_entry.setDisabled(True)
        self.job_desc_entry.setStyleSheet(input_style)
        self.job_desc_entry.setPlaceholderText("Upload Job Description")
        self.job_desc_input_layout.addWidget(self.job_desc_entry)

        self.browse_job_desc_button = QPushButton("Browse", self.job_desc_frame)
        self.browse_job_desc_button.setStyleSheet(button_style)
        self.browse_job_desc_button.setFont(QFont("Russo One", 12))
        self.browse_job_desc_button.clicked.connect(self.browse_job_descriptions)
        self.job_desc_input_layout.addWidget(self.browse_job_desc_button)

        self.job_desc_layout.addLayout(self.job_desc_input_layout)
        input_container.addWidget(self.job_desc_frame)

        self.advanced_options_visible = False

        # Advanced Button
        self.advanced_button = QPushButton("Advanced", self)
        self.advanced_button.setStyleSheet(
            """
            QPushButton {
                background: transparent;
                color: white;
                text-decoration: underline;
                border: none;
                font-size: 13px;
                text-align: right;
                margin-right: 10px;
            }
            QPushButton:hover {
                color: #004FCC;
            }
        """
        )

        self.advanced_button.setFont(QFont("Russo One", 12))
        self.advanced_button.clicked.connect(self.toggle_advanced_options)
        input_container.addWidget(self.advanced_button)

        # Advanced Options Frame (Initially Hidden)
        self.advanced_frame = QFrame(self)
        self.advanced_frame.setVisible(False)
        self.advanced_layout = QVBoxLayout(self.advanced_frame)

        self.score_top_label = QLabel("Score Top:", self.advanced_frame)
        self.score_top_label.setFont(QFont("Russo One", 10))
        self.advanced_layout.addWidget(self.score_top_label)

        self.score_top_input = QSpinBox(self.advanced_frame)
        self.score_top_input.setMinimum(0)
        self.score_top_input.setValue(0)
        self.score_top_input.setMaximum(500)
        self.score_top_input.setFixedWidth(100)
        self.score_top_input.setStyleSheet(
            """
            QSpinBox {
                background-color: rgba(0, 20, 46, 0.6);
                color: #e7e7e7;
                font-size: 14px;
                padding: 6px;
                border: 1px solid gray;
                border-radius: 5px;
                height: 30px;
            }
        """
        )
        self.advanced_layout.addWidget(self.score_top_input)

        input_container.addWidget(self.advanced_frame)

        main_layout.addLayout(input_container)

        spacer_bottom = QSpacerItem(
            20, 40, QSizePolicy.Policy.Minimum, QSizePolicy.Policy.Expanding
        )
        main_layout.addItem(spacer_bottom)

        self.submit_button = QPushButton("START", self)
        self.submit_button.setStyleSheet(
            "background-color: #0074FF; color: #00142D; padding: 10px 20px; font-size: 16px;"
        )
        self.submit_button.setFont(QFont("Russo One", 14))
        self.submit_button.clicked.connect(self.submit_action)
        main_layout.addWidget(self.submit_button)

        self.setLayout(main_layout)

    def resizeEvent(self, event):
        self.bg_label.setPixmap(
            self.bg_pixmap.scaled(
                self.size(), Qt.AspectRatioMode.KeepAspectRatioByExpanding
            )
        )
        self.bg_label.setGeometry(self.rect())
        super().resizeEvent(event)

    def toggle_advanced_options(self):
        self.advanced_options_visible = not self.advanced_options_visible
        self.advanced_frame.setVisible(self.advanced_options_visible)

        if self.advanced_options_visible:
            self.resize(600, 500)
        else:
            self.resize(600, 400)

    def browse_resumes(self):
        files, _ = QFileDialog.getOpenFileNames(
            self, "Select Resumes", "", "PDF Files (*.pdf)"
        )
        if files:
            for file in files:
                if not file.lower().endswith(".pdf"):
                    QMessageBox.warning(
                        self, "Invalid File", "Only PDF files are allowed for resumes."
                    )
                    return
            self.resume_files = files
            self.resume_entry.setEnabled(True)
            self.resume_entry.setText(f"{len(files)} file(s) selected")
            self.resume_entry.setDisabled(True)

    def browse_job_descriptions(self):
        files, _ = QFileDialog.getOpenFileNames(
            self, "Select Job Descriptions", "", "PDF Files (*.pdf)"
        )
        if files:
            for file in files:
                if not file.lower().endswith(".pdf"):
                    QMessageBox.warning(
                        self,
                        "Invalid File",
                        "Only PDF files are allowed for job descriptions.",
                    )
                    return
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
        config.candidates_to_score_count = self.score_top_input.value() or 0

        if not hasattr(self, "resume_files") or not self.resume_files:
            QMessageBox.critical(self, "Error", "Please select at least one resume.")
            return
        if not hasattr(self, "job_desc_files") or not self.job_desc_files:
            QMessageBox.critical(
                self, "Error", "Please select at least one job description."
            )
            return

        try:
            for file in self.resume_files:
                shutil.copy(file, "resumes")
            for file in self.job_desc_files:
                shutil.copy(file, "job_descriptions")
            self.start_processing()
            self.delete_all_uploaded_files()
            QMessageBox.information(
                self,
                "Success",
                "Processing complete. Please check the output folder for results.",
            )

        except Exception as e:
            QMessageBox.critical(self, "Error", f"An error occurred: {str(e)}")
        finally:
            self.submit_button.setEnabled(True)
            self.submit_button.setText("Start")
