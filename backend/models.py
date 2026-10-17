from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Date,
    DateTime,
    Boolean,
    Numeric,
    ForeignKey,
    Enum
)
from sqlalchemy.sql import func
from database import Base


class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    phone = Column(String(15))
    role = Column(
        Enum("student", "recruiter"),
        default="student",
        nullable=False
    )
    created_at = Column(DateTime, server_default=func.now())


class Student(Base):
    __tablename__ = "students"

    student_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.user_id", ondelete="CASCADE"),
        unique=True,
        nullable=False
    )
    date_of_birth = Column(Date)
    gender = Column(String(20))
    college = Column(String(150))
    degree = Column(String(100))
    branch = Column(String(100))
    year = Column(Integer)
    semester = Column(Integer)
    cgpa = Column(Numeric(4, 2))
    location = Column(String(100))
    career_objective = Column(Text)
    preferred_role = Column(String(100))
    linkedin_url = Column(String(255))
    github_url = Column(String(255))
    created_at = Column(DateTime, server_default=func.now())


class Skill(Base):
    __tablename__ = "skills"

    skill_id = Column(Integer, primary_key=True, index=True)
    skill_name = Column(String(100), unique=True, nullable=False)
    skill_category = Column(String(100))
    created_at = Column(DateTime, server_default=func.now())


class StudentSkill(Base):
    __tablename__ = "student_skills"

    student_skill_id = Column(Integer, primary_key=True, index=True)
    student_id = Column(
        Integer,
        ForeignKey("students.student_id", ondelete="CASCADE"),
        nullable=False
    )
    skill_id = Column(
        Integer,
        ForeignKey("skills.skill_id", ondelete="CASCADE"),
        nullable=False
    )
    skill_level = Column(
        Enum("Beginner", "Intermediate", "Advanced", "Expert"),
        default="Beginner"
    )
    years_experience = Column(Numeric(3, 1), default=0)
    created_at = Column(DateTime, server_default=func.now())


class Project(Base):
    __tablename__ = "projects"

    project_id = Column(Integer, primary_key=True, index=True)
    student_id = Column(
        Integer,
        ForeignKey("students.student_id", ondelete="CASCADE"),
        nullable=False
    )
    title = Column(String(150), nullable=False)
    description = Column(Text)
    technologies = Column(Text)
    project_role = Column(String(100))
    start_date = Column(Date)
    end_date = Column(Date)
    github_url = Column(String(255))
    live_url = Column(String(255))
    created_at = Column(DateTime, server_default=func.now())


class Certificate(Base):
    __tablename__ = "certificates"

    certificate_id = Column(Integer, primary_key=True, index=True)
    student_id = Column(
        Integer,
        ForeignKey("students.student_id", ondelete="CASCADE"),
        nullable=False
    )
    certificate_name = Column(String(200), nullable=False)
    issuing_organization = Column(String(150))
    issue_date = Column(Date)
    expiry_date = Column(Date)
    credential_id = Column(String(150))
    certificate_url = Column(String(255))
    created_at = Column(DateTime, server_default=func.now())


class Resume(Base):
    __tablename__ = "resumes"

    resume_id = Column(Integer, primary_key=True, index=True)
    student_id = Column(
        Integer,
        ForeignKey("students.student_id", ondelete="CASCADE"),
        nullable=False
    )
    file_name = Column(String(255))
    file_url = Column(String(500))
    target_role = Column(String(100))
    version = Column(Integer, default=1)
    resume_score = Column(Numeric(5, 2))
    ai_generated = Column(Boolean, default=False)
    uploaded_at = Column(DateTime, server_default=func.now())


class Assessment(Base):
    __tablename__ = "assessments"

    assessment_id = Column(Integer, primary_key=True, index=True)
    student_id = Column(
        Integer,
        ForeignKey("students.student_id", ondelete="CASCADE"),
        nullable=False
    )
    skill_id = Column(
        Integer,
        ForeignKey("skills.skill_id", ondelete="SET NULL")
    )
    difficulty = Column(
        Enum("Beginner", "Intermediate", "Advanced"),
        default="Intermediate"
    )
    start_time = Column(DateTime)
    end_time = Column(DateTime)
    status = Column(
        Enum("Not Started", "In Progress", "Completed", "Cancelled"),
        default="Not Started"
    )
    created_at = Column(DateTime, server_default=func.now())


class AssessmentQuestion(Base):
    __tablename__ = "assessment_questions"

    question_id = Column(Integer, primary_key=True, index=True)
    assessment_id = Column(
        Integer,
        ForeignKey("assessments.assessment_id", ondelete="CASCADE"),
        nullable=False
    )
    question_text = Column(Text, nullable=False)
    option_a = Column(String(500))
    option_b = Column(String(500))
    option_c = Column(String(500))
    option_d = Column(String(500))
    correct_answer = Column(Enum("A", "B", "C", "D"))
    difficulty = Column(
        Enum("Easy", "Medium", "Hard"),
        default="Medium"
    )
    created_at = Column(DateTime, server_default=func.now())


class AssessmentAnswer(Base):
    __tablename__ = "assessment_answers"

    answer_id = Column(Integer, primary_key=True, index=True)
    assessment_id = Column(
        Integer,
        ForeignKey("assessments.assessment_id", ondelete="CASCADE"),
        nullable=False
    )
    question_id = Column(
        Integer,
        ForeignKey("assessment_questions.question_id", ondelete="CASCADE"),
        nullable=False
    )
    student_id = Column(
        Integer,
        ForeignKey("students.student_id", ondelete="CASCADE"),
        nullable=False
    )
    selected_answer = Column(Enum("A", "B", "C", "D"))
    is_correct = Column(Boolean)
    answered_at = Column(DateTime, server_default=func.now())


class AssessmentResult(Base):
    __tablename__ = "assessment_results"

    result_id = Column(Integer, primary_key=True, index=True)
    assessment_id = Column(
        Integer,
        ForeignKey("assessments.assessment_id", ondelete="CASCADE"),
        nullable=False,
        unique=True
    )
    student_id = Column(
        Integer,
        ForeignKey("students.student_id", ondelete="CASCADE"),
        nullable=False
    )
    total_questions = Column(Integer, default=0)
    correct_answers = Column(Integer, default=0)
    wrong_answers = Column(Integer, default=0)
    unanswered = Column(Integer, default=0)
    score = Column(Numeric(5, 2), default=0)
    accuracy = Column(Numeric(5, 2), default=0)
    time_taken = Column(Integer)
    completed_at = Column(DateTime, server_default=func.now())


class AssessmentSkillAnalysis(Base):
    __tablename__ = "assessment_skill_analysis"

    analysis_id = Column(Integer, primary_key=True, index=True)
    result_id = Column(
        Integer,
        ForeignKey("assessment_results.result_id", ondelete="CASCADE"),
        nullable=False
    )
    skill_id = Column(
        Integer,
        ForeignKey("skills.skill_id", ondelete="CASCADE"),
        nullable=False
    )
    questions_attempted = Column(Integer, default=0)
    correct_answers = Column(Integer, default=0)
    score = Column(Numeric(5, 2), default=0)
    strength_level = Column(
        Enum("Needs Improvement", "Average", "Good", "Strong")
    )