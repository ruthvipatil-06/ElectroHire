# ============================================================
# ELECTROHIRE BACKEND
# FastAPI + MySQL
#
# Student identity:
# student_details.user_id
#
# NO students TABLE is used.
# ============================================================

from fastapi import (
    FastAPI,
    HTTPException,
    UploadFile,
    File,
    Form
)


from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from pydantic import BaseModel
from sqlalchemy import create_engine, text

from typing import Optional
from datetime import datetime
from urllib.parse import quote_plus

import os
import shutil

from dotenv import load_dotenv


# ============================================================
# DATABASE CONFIGURATION
# ============================================================

# Load environment variables from the .env file beside this main.py.
# On Render, the same variables will be entered in the service settings.
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

DB_HOST = os.getenv("DB_HOST")
DB_PORT = int(os.getenv("DB_PORT", "28585"))
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_NAME = os.getenv("DB_NAME")
DB_SSL_CA = os.getenv("DB_SSL_CA", "ca.pem")

if not all([DB_HOST, DB_USER, DB_PASSWORD, DB_NAME]):
    raise RuntimeError(
        "Database configuration is incomplete. Set DB_HOST, DB_USER, "
        "DB_PASSWORD and DB_NAME in the backend .env file or hosting environment."
    )

# Resolve a relative certificate path from the backend folder.
# An absolute path supplied by the hosting environment is kept unchanged.
if not os.path.isabs(DB_SSL_CA):
    DB_SSL_CA = os.path.join(BASE_DIR, DB_SSL_CA)

if not os.path.isfile(DB_SSL_CA):
    raise RuntimeError(
        f"Aiven CA certificate was not found at: {DB_SSL_CA}. "
        "Place ca.pem beside main.py or set DB_SSL_CA to its full path."
    )


# ============================================================
# DATABASE URL
# ============================================================

DATABASE_URL = (
    f"mysql+pymysql://"
    f"{quote_plus(DB_USER)}:"
    f"{quote_plus(DB_PASSWORD)}"
    f"@{DB_HOST}:{DB_PORT}/{DB_NAME}"
)


# ============================================================
# DATABASE ENGINE
# ============================================================

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    future=True,
    connect_args={
        "ssl": {
            "ca": DB_SSL_CA
        }
    }
)


# ============================================================
# FASTAPI
# ============================================================

app = FastAPI(
    title="ElectroHire Backend",
    version="1.0.0"
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "https://electro-hire.vercel.app",
        "https://electro-hire-g69x.vercel.app",
        "https://electrohire.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# UPLOAD DIRECTORY
# ============================================================

UPLOAD_DIR = "uploads"

os.makedirs(
    UPLOAD_DIR,
    exist_ok=True
)

app.mount(
    "/uploads",
    StaticFiles(directory=UPLOAD_DIR),
    name="uploads"
)


# ============================================================
# STARTUP
# ============================================================

@app.on_event("startup")
def startup():

    try:

        with engine.connect() as connection:

            connection.execute(
                text("SELECT 1")
            )

        print("======================================")
        print("ElectroHire Backend Started")
        print("MySQL Database Connected")
        print("Database:", DB_NAME)
        print("======================================")

    except Exception as e:

        print("======================================")
        print("Database connection failed")
        print(e)
        print("======================================")


# ============================================================
# ROOT
# ============================================================

@app.get("/")
def root():

    return {
        "message": "ElectroHire Backend is running!"
    }


# ============================================================
# TEST DATABASE
# ============================================================

@app.get("/api/test-db")
def test_database():

    try:

        with engine.connect() as connection:

            result = connection.execute(
                text(
                    "SELECT DATABASE() AS db"
                )
            ).mappings().first()

            return {
                "status": "success",
                "database": result["db"]
            }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Database connection failed: {str(e)}"
        )


# ============================================================
# HELPER: TABLE EXISTS
# ============================================================

def table_exists(
    connection,
    table_name
):

    result = connection.execute(
        text("""
            SELECT COUNT(*) AS count
            FROM information_schema.tables
            WHERE table_schema = :database_name
            AND table_name = :table_name
        """),
        {
            "database_name": DB_NAME,
            "table_name": table_name
        }
    ).mappings().first()

    return result["count"] > 0


# ============================================================
# HELPER: TABLE COLUMNS
# ============================================================

def get_table_columns(
    connection,
    table_name
):

    result = connection.execute(
        text(
            f"SHOW COLUMNS FROM `{table_name}`"
        )
    ).mappings().all()

    return [
        row["Field"]
        for row in result
    ]


# ============================================================
# HELPER: FIND PASSWORD COLUMN
# ============================================================

def get_password_column(connection):

    columns = get_table_columns(
        connection,
        "users"
    )

    if "password" in columns:
        return "password"

    if "password_hash" in columns:
        return "password_hash"

    raise HTTPException(
        status_code=500,
        detail=(
            "Users table does not contain a password column. "
            "Expected either 'password' or 'password_hash'."
        )
    )


# ============================================================
# GET USER
# ============================================================

def get_user_by_id(
    connection,
    user_id
):

    result = connection.execute(
        text("""
            SELECT *
            FROM users
            WHERE user_id = :user_id
            LIMIT 1
        """),
        {
            "user_id": user_id
        }
    ).mappings().first()

    return result


# ============================================================
# GET USER BY EMAIL
# ============================================================

def get_user_by_email(
    connection,
    email
):

    result = connection.execute(
        text("""
            SELECT *
            FROM users
            WHERE email = :email
            LIMIT 1
        """),
        {
            "email": email
        }
    ).mappings().first()

    return result


# ============================================================
# FIND STUDENT ID
#
# student_details.user_id is the student identifier.
# ============================================================

def find_student_id(
    connection,
    user_id
):

    if not table_exists(
        connection,
        "student_details"
    ):

        raise HTTPException(
            status_code=500,
            detail="student_details table does not exist."
        )

    columns = get_table_columns(
        connection,
        "student_details"
    )

    if "user_id" not in columns:

        raise HTTPException(
            status_code=500,
            detail=(
                "student_details must contain "
                "user_id."
            )
        )

    student = connection.execute(
        text("""
            SELECT user_id
            FROM student_details
            WHERE user_id = :user_id
            LIMIT 1
        """),
        {
            "user_id": user_id
        }
    ).mappings().first()

    if not student:

        raise HTTPException(
            status_code=404,
            detail=(
                "Student profile not found. "
                "Please save your My Profile first."
            )
        )

    return student["user_id"]


# ============================================================
# REGISTER
# ============================================================

class RegisterRequest(BaseModel):

    full_name: str
    email: str
    password: str
    role: str


@app.post("/api/register")
def register_user(
    request: RegisterRequest
):

    try:

        # --------------------------------------------------------
        # BASIC VALIDATION
        # --------------------------------------------------------

        full_name = request.full_name.strip()
        email = request.email.strip().lower()
        role = request.role.strip().lower()

        if not full_name:

            raise HTTPException(
                status_code=400,
                detail="Full name is required."
            )

        if not email:

            raise HTTPException(
                status_code=400,
                detail="Email is required."
            )

        if not request.password:

            raise HTTPException(
                status_code=400,
                detail="Password is required."
            )

        # Only these two roles are supported by ElectroHire.
        if role not in ["student", "recruiter"]:

            raise HTTPException(
                status_code=400,
                detail="Invalid role. Choose Student or Recruiter."
            )

        with engine.begin() as connection:

            # ----------------------------------------------------
            # CHECK EMAIL
            # ----------------------------------------------------

            existing_user = connection.execute(
                text("""
                    SELECT user_id
                    FROM users
                    WHERE LOWER(email) = :email
                    LIMIT 1
                """),
                {
                    "email": email
                }
            ).first()

            if existing_user:

                raise HTTPException(
                    status_code=400,
                    detail="Email already registered"
                )

            # ----------------------------------------------------
            # FIND PASSWORD COLUMN
            # ----------------------------------------------------

            password_column = get_password_column(
                connection
            )

            # ----------------------------------------------------
            # CREATE USER
            #
            # Both students and recruiters are stored in the same
            # users table. The role column identifies the account.
            # ----------------------------------------------------

            query = f"""
                INSERT INTO users
                (
                    full_name,
                    email,
                    `{password_column}`,
                    role
                )
                VALUES
                (
                    :full_name,
                    :email,
                    :password,
                    :role
                )
            """

            result = connection.execute(
                text(query),
                {
                    "full_name": full_name,
                    "email": email,
                    "password": request.password,
                    "role": role
                }
            )

            user_id = result.lastrowid

            # ----------------------------------------------------
            # STUDENT ONLY
            # ----------------------------------------------------
            # Recruiters do NOT get a student_details record.
            # Their identity remains users.user_id.
            # ----------------------------------------------------

            if role == "student":

                connection.execute(
                    text("""
                        INSERT INTO student_details
                        (
                            user_id
                        )
                        VALUES
                        (
                            :user_id
                        )
                    """),
                    {
                        "user_id": user_id
                    }
                )

            elif role == "recruiter":

                # Create the recruiter profile row immediately.
                # The detailed company information can be filled
                # later from Recruiter My Profile.
                connection.execute(
                    text("""
                        INSERT INTO recruiter_details
                        (
                            user_id
                        )
                        VALUES
                        (
                            :user_id
                        )
                    """),
                    {
                        "user_id": user_id
                    }
                )

            return {
                "message": "Registration successful",
                "user_id": user_id,
                "role": role
            }

    except HTTPException:
        raise

    except Exception as e:

        print("REGISTER ERROR:", str(e))

        raise HTTPException(
            status_code=500,
            detail=f"Registration failed: {str(e)}"
        )


# ============================================================
# LOGIN
# ============================================================

class LoginRequest(BaseModel):

    email: str
    password: str


@app.post("/api/login")
def login_user(
    request: LoginRequest
):

    try:

        # --------------------------------------------------------
        # NORMALIZE EMAIL
        # --------------------------------------------------------

        email = request.email.strip().lower()

        if not email or not request.password:

            raise HTTPException(
                status_code=400,
                detail="Email and password are required."
            )

        with engine.connect() as connection:

            password_column = get_password_column(
                connection
            )

            # ----------------------------------------------------
            # FIND USER USING EMAIL + PASSWORD
            # ----------------------------------------------------
            # The role is read from the SAME users record.
            # This is what detects student vs recruiter.
            # ----------------------------------------------------

            query = f"""
                SELECT *
                FROM users
                WHERE LOWER(email) = :email
                AND `{password_column}` = :password
                LIMIT 1
            """

            user = connection.execute(
                text(query),
                {
                    "email": email,
                    "password": request.password
                }
            ).mappings().first()

            if not user:

                raise HTTPException(
                    status_code=401,
                    detail="Invalid email or password"
                )

            # ----------------------------------------------------
            # GET ROLE FROM DATABASE
            # ----------------------------------------------------

            role = str(
                user.get("role", "")
            ).strip().lower()

            if role not in ["student", "recruiter"]:

                raise HTTPException(
                    status_code=500,
                    detail="Invalid account role stored in database."
                )

            # ----------------------------------------------------
            # STUDENT ID
            # ----------------------------------------------------
            # Recruiters do not have student_details, so this
            # remains None for recruiter accounts.
            # ----------------------------------------------------

            student_id = None

            if role == "student":

                student = connection.execute(
                    text("""
                        SELECT user_id
                        FROM student_details
                        WHERE user_id = :user_id
                        LIMIT 1
                    """),
                    {
                        "user_id": user["user_id"]
                    }
                ).mappings().first()

                if student:

                    student_id = student["user_id"]

            # ----------------------------------------------------
            # RETURN ROLE TO FRONTEND
            # ----------------------------------------------------
            # Login.jsx uses this role to decide the dashboard:
            # recruiter -> /recruiter-dashboard
            # student   -> /dashboard
            # ----------------------------------------------------

            return {
                "message": "Login successful",
                "user_id": user["user_id"],
                "student_id": student_id,
                "email": user["email"],
                "full_name": user.get("full_name"),
                "role": role
            }

    except HTTPException:
        raise

    except Exception as e:

        print("LOGIN ERROR:", str(e))

        raise HTTPException(
            status_code=500,
            detail=f"Login failed: {str(e)}"
        )


# ============================================================
# PROFILE
# ============================================================

class ProfileRequest(BaseModel):

    full_name: Optional[str] = None
    phone: Optional[str] = None

    date_of_birth: Optional[str] = None
    gender: Optional[str] = None

    college: Optional[str] = None
    degree: Optional[str] = None
    branch: Optional[str] = None

    year: Optional[str] = None
    semester: Optional[str] = None
    cgpa: Optional[float] = None

    location: Optional[str] = None

    career_objective: Optional[str] = None
    preferred_role: Optional[str] = None

    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None


PROFILE_FIELDS = [
    "date_of_birth",
    "gender",
    "college",
    "degree",
    "branch",
    "year",
    "semester",
    "cgpa",
    "location",
    "career_objective",
    "preferred_role",
    "linkedin_url",
    "github_url"
]


# ============================================================
# GET PROFILE
# ============================================================

@app.get("/api/profile/{user_id}")
def get_profile(
    user_id: str
):

    try:

        with engine.connect() as connection:

            # Backward-compatible identity lookup:
            # accept either the numeric user_id used by most pages,
            # or the email currently sent by Dashboard.jsx.
            requested_identity = str(user_id).strip()

            if requested_identity.isdigit():
                resolved_user_id = int(requested_identity)
                user = get_user_by_id(connection, resolved_user_id)
            else:
                user = get_user_by_email(connection, requested_identity.lower())
                resolved_user_id = user["user_id"] if user else None

            if not user:

                raise HTTPException(
                    status_code=404,
                    detail="User not found"
                )

            details = connection.execute(
                text("""
                    SELECT *
                    FROM student_details
                    WHERE user_id = :user_id
                    LIMIT 1
                """),
                {
                    "user_id": resolved_user_id
                }
            ).mappings().first()

            profile = {
                "user_id": user["user_id"],
                "student_id": user["user_id"],
                "email": user.get("email"),
                "role": user.get("role"),
                "full_name": user.get("full_name"),
                "phone": None,
                "date_of_birth": None,
                "gender": None,
                "college": None,
                "degree": None,
                "branch": None,
                "year": None,
                "semester": None,
                "cgpa": None,
                "location": None,
                "career_objective": None,
                "preferred_role": None,
                "linkedin_url": None,
                "github_url": None
            }

            users_columns = get_table_columns(
                connection,
                "users"
            )

            if "phone" in users_columns:

                profile["phone"] = user.get(
                    "phone"
                )

            if details:

                for key, value in details.items():

                    if key in profile:

                        profile[key] = value

            return profile

    except HTTPException:
        raise

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Profile loading failed: {str(e)}"
        )


# ============================================================
# UPDATE PROFILE
# ============================================================

@app.put("/api/profile/{user_id}")
def update_profile(
    user_id: int,
    request: ProfileRequest
):

    try:

        with engine.begin() as connection:

            user = get_user_by_id(
                connection,
                user_id
            )

            if not user:

                raise HTTPException(
                    status_code=404,
                    detail="User not found"
                )

            columns = get_table_columns(
                connection,
                "student_details"
            )

            users_columns = get_table_columns(
                connection,
                "users"
            )

            if (
                request.full_name is not None
                and "full_name" in users_columns
            ):

                connection.execute(
                    text("""
                        UPDATE users
                        SET full_name = :full_name
                        WHERE user_id = :user_id
                    """),
                    {
                        "full_name": request.full_name,
                        "user_id": user_id
                    }
                )

            if (
                request.phone is not None
                and "phone" in users_columns
            ):

                connection.execute(
                    text("""
                        UPDATE users
                        SET phone = :phone
                        WHERE user_id = :user_id
                    """),
                    {
                        "phone": request.phone,
                        "user_id": user_id
                    }
                )

            values = {}

            for field in PROFILE_FIELDS:

                if field in columns:

                    value = getattr(
                        request,
                        field,
                        None
                    )

                    if value is not None:

                        values[field] = value

            existing = connection.execute(
                text("""
                    SELECT user_id
                    FROM student_details
                    WHERE user_id = :user_id
                    LIMIT 1
                """),
                {
                    "user_id": user_id
                }
            ).mappings().first()

            if existing:

                if values:

                    set_parts = []

                    parameters = {
                        "user_id": user_id
                    }

                    for field, value in values.items():

                        set_parts.append(
                            f"`{field}` = :{field}"
                        )

                        parameters[field] = value

                    query = f"""
                        UPDATE student_details
                        SET {", ".join(set_parts)}
                        WHERE user_id = :user_id
                    """

                    connection.execute(
                        text(query),
                        parameters
                    )

            else:

                insert_values = {
                    "user_id": user_id
                }

                insert_values.update(values)

                field_names = list(
                    insert_values.keys()
                )

                field_sql = ", ".join(
                    f"`{field}`"
                    for field in field_names
                )

                value_sql = ", ".join(
                    f":{field}"
                    for field in field_names
                )

                query = f"""
                    INSERT INTO student_details
                    ({field_sql})
                    VALUES
                    ({value_sql})
                """

                connection.execute(
                    text(query),
                    insert_values
                )

            return {
                "message": "Profile updated successfully",
                "user_id": user_id
            }

    except HTTPException:
        raise

    except Exception as e:

        print("PROFILE UPDATE ERROR:", str(e))

        raise HTTPException(
            status_code=500,
            detail=f"Profile update failed: {str(e)}"
        )


# ============================================================
# SKILLS
# ============================================================

@app.get("/api/skills")
def get_skills():

    try:

        with engine.connect() as connection:

            result = connection.execute(
                text("""
                    SELECT *
                    FROM skills
                    ORDER BY skill_name
                """)
            ).mappings().all()

            return {
                "skills": [
                    dict(row)
                    for row in result
                ]
            }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Failed to load skills: {str(e)}"
        )


# ============================================================
# GET STUDENT SKILLS
# ============================================================

@app.get("/api/student-skills/{user_id}")
def get_student_skills(
    user_id: int
):

    try:

        with engine.connect() as connection:

            student_id = find_student_id(
                connection,
                user_id
            )

            result = connection.execute(
                text("""
                    SELECT
                        ss.student_skill_id,
                        ss.student_id,
                        ss.skill_id,
                        ss.skill_level,
                        ss.years_experience,
                        ss.created_at,
                        s.skill_name
                    FROM student_skills ss
                    JOIN skills s
                        ON ss.skill_id = s.skill_id
                    WHERE ss.student_id = :student_id
                    ORDER BY ss.student_skill_id DESC
                """),
                {
                    "student_id": student_id
                }
            ).mappings().all()

            return {
                "skills": [
                    dict(row)
                    for row in result
                ]
            }

    except HTTPException:
        raise

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to load student skills: "
                f"{str(e)}"
            )
        )


# ============================================================
# ADD STUDENT SKILL
# ============================================================

class StudentSkillRequest(BaseModel):

    user_id: int
    skill_id: int
    skill_level: Optional[str] = "Beginner"
    years_experience: Optional[float] = 0.0
    proficiency: Optional[str] = None


@app.post("/api/student-skills")
def add_student_skill(
    request: StudentSkillRequest
):

    try:

        with engine.begin() as connection:

            student_id = find_student_id(
                connection,
                request.user_id
            )

            skill = connection.execute(
                text("""
                    SELECT skill_id
                    FROM skills
                    WHERE skill_id = :skill_id
                    LIMIT 1
                """),
                {
                    "skill_id": request.skill_id
                }
            ).first()

            if not skill:

                raise HTTPException(
                    status_code=404,
                    detail="Skill not found."
                )

            final_skill_level = (
                request.skill_level
                if request.skill_level
                else request.proficiency
            )

            if not final_skill_level:

                final_skill_level = "Beginner"

            allowed_levels = [
                "Beginner",
                "Intermediate",
                "Advanced",
                "Expert"
            ]

            if final_skill_level not in allowed_levels:

                raise HTTPException(
                    status_code=400,
                    detail=(
                        "Invalid skill level. "
                        "Use Beginner, Intermediate, "
                        "Advanced or Expert."
                    )
                )

            experience = (
                request.years_experience
                if request.years_experience is not None
                else 0.0
            )

            existing = connection.execute(
                text("""
                    SELECT student_skill_id
                    FROM student_skills
                    WHERE student_id = :student_id
                    AND skill_id = :skill_id
                    LIMIT 1
                """),
                {
                    "student_id": student_id,
                    "skill_id": request.skill_id
                }
            ).first()

            if existing:

                raise HTTPException(
                    status_code=400,
                    detail="This skill is already added."
                )

            connection.execute(
                text("""
                    INSERT INTO student_skills
                    (
                        student_id,
                        skill_id,
                        skill_level,
                        years_experience
                    )
                    VALUES
                    (
                        :student_id,
                        :skill_id,
                        :skill_level,
                        :years_experience
                    )
                """),
                {
                    "student_id": student_id,
                    "skill_id": request.skill_id,
                    "skill_level": final_skill_level,
                    "years_experience": experience
                }
            )

            return {
                "message": "Skill added successfully"
            }

    except HTTPException:
        raise

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Failed to add skill: {str(e)}"
        )


# ============================================================
# DELETE STUDENT SKILL
# ============================================================

@app.delete("/api/student-skills/{student_skill_id}")
def delete_student_skill(
    student_skill_id: int
):

    try:

        with engine.begin() as connection:

            result = connection.execute(
                text("""
                    DELETE FROM student_skills
                    WHERE student_skill_id = :id
                """),
                {
                    "id": student_skill_id
                }
            )

            if result.rowcount == 0:

                raise HTTPException(
                    status_code=404,
                    detail="Student skill not found."
                )

            return {
                "message": "Skill deleted successfully"
            }

    except HTTPException:
        raise

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete skill: {str(e)}"
        )


# ============================================================
# PROJECTS
# ============================================================

@app.get("/api/projects/{user_id}")
def get_projects(
    user_id: int
):

    try:

        with engine.connect() as connection:

            student_id = find_student_id(
                connection,
                user_id
            )

            result = connection.execute(
                text("""
                    SELECT
                        project_id,
                        student_id,
                        title,
                        description,
                        technologies,
                        project_role,
                        start_date,
                        end_date,
                        github_url,
                        live_url,
                        created_at
                    FROM projects
                    WHERE student_id = :student_id
                    ORDER BY project_id DESC
                """),
                {
                    "student_id": student_id
                }
            ).mappings().all()

            return {
                "projects": [
                    dict(row)
                    for row in result
                ]
            }

    except HTTPException:
        raise

    except Exception as e:

        print("GET PROJECTS ERROR:", str(e))

        raise HTTPException(
            status_code=500,
            detail=f"Failed to load projects: {str(e)}"
        )


class ProjectRequest(BaseModel):

    user_id: int

    title: str
    description: str
    technologies: str

    project_role: Optional[str] = None

    start_date: Optional[str] = None
    end_date: Optional[str] = None

    github_url: Optional[str] = None
    live_url: Optional[str] = None


@app.post("/api/projects")
def add_project(request: ProjectRequest):

    try:

        if not request.title or not request.title.strip():

            raise HTTPException(
                status_code=400,
                detail="Project title is required."
            )

        if not request.description or not request.description.strip():

            raise HTTPException(
                status_code=400,
                detail="Project description is required."
            )

        if not request.technologies or not request.technologies.strip():

            raise HTTPException(
                status_code=400,
                detail="Technologies used are required."
            )

        with engine.begin() as connection:

            student_id = find_student_id(
                connection,
                request.user_id
            )

            clean_title = request.title.strip()

            clean_description = request.description.strip()

            clean_technologies = request.technologies.strip()

            clean_project_role = (
                request.project_role.strip()
                if request.project_role
                else None
            )

            clean_start_date = (
                request.start_date.strip()
                if request.start_date
                else None
            )

            clean_end_date = (
                request.end_date.strip()
                if request.end_date
                else None
            )

            clean_github_url = (
                request.github_url.strip()
                if request.github_url
                else None
            )

            clean_live_url = (
                request.live_url.strip()
                if request.live_url
                else None
            )

            if clean_project_role == "":
                clean_project_role = None

            if clean_start_date == "":
                clean_start_date = None

            if clean_end_date == "":
                clean_end_date = None

            if clean_github_url == "":
                clean_github_url = None

            if clean_live_url == "":
                clean_live_url = None

            result = connection.execute(
                text("""
                    INSERT INTO projects
                    (
                        student_id,
                        title,
                        description,
                        technologies,
                        project_role,
                        start_date,
                        end_date,
                        github_url,
                        live_url
                    )
                    VALUES
                    (
                        :student_id,
                        :title,
                        :description,
                        :technologies,
                        :project_role,
                        :start_date,
                        :end_date,
                        :github_url,
                        :live_url
                    )
                """),
                {
                    "student_id": student_id,
                    "title": clean_title,
                    "description": clean_description,
                    "technologies": clean_technologies,
                    "project_role": clean_project_role,
                    "start_date": clean_start_date,
                    "end_date": clean_end_date,
                    "github_url": clean_github_url,
                    "live_url": clean_live_url
                }
            )

            project_id = result.lastrowid

            return {
                "message": "Project added successfully",
                "project_id": project_id,
                "student_id": student_id
            }

    except HTTPException:
        raise

    except Exception as e:

        print("PROJECT INSERT ERROR:", str(e))

        raise HTTPException(
            status_code=500,
            detail=f"Failed to add project: {str(e)}"
        )


@app.delete("/api/projects/{project_id}")
def delete_project(project_id: int):

    try:

        with engine.begin() as connection:

            project = connection.execute(
                text("""
                    SELECT project_id
                    FROM projects
                    WHERE project_id = :project_id
                    LIMIT 1
                """),
                {
                    "project_id": project_id
                }
            ).first()

            if not project:

                raise HTTPException(
                    status_code=404,
                    detail="Project not found."
                )

            result = connection.execute(
                text("""
                    DELETE FROM projects
                    WHERE project_id = :project_id
                """),
                {
                    "project_id": project_id
                }
            )

            if result.rowcount == 0:

                raise HTTPException(
                    status_code=404,
                    detail="Project not found."
                )

            return {
                "message": "Project deleted successfully",
                "project_id": project_id
            }

    except HTTPException:
        raise

    except Exception as e:

        print("DELETE PROJECT ERROR:", str(e))

        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete project: {str(e)}"
        )


# ============================================================
# CERTIFICATES
# ============================================================

class CertificateRequest(BaseModel):

    user_id: int
    certificate_name: str
    issuing_organization: str
    issue_date: str
    expiry_date: Optional[str] = None
    credential_id: Optional[str] = None
    certificate_url: Optional[str] = None


@app.get("/api/certificates/{user_id}")
def get_certificates(user_id: int):

    try:

        with engine.connect() as connection:

            student_id = find_student_id(
                connection,
                user_id
            )

            result = connection.execute(
                text("""
                    SELECT
                        certificate_id,
                        student_id,
                        certificate_name,
                        issuing_organization,
                        issue_date,
                        expiry_date,
                        credential_id,
                        certificate_url,
                        created_at
                    FROM certificates
                    WHERE student_id = :student_id
                    ORDER BY certificate_id DESC
                """),
                {
                    "student_id": student_id
                }
            )

            rows = result.mappings().all()

            certificates = []

            for row in rows:

                certificate = dict(row)

                if certificate.get("issue_date"):
                    certificate["issue_date"] = (
                        certificate["issue_date"].isoformat()
                    )

                if certificate.get("expiry_date"):
                    certificate["expiry_date"] = (
                        certificate["expiry_date"].isoformat()
                    )

                if certificate.get("created_at"):
                    certificate["created_at"] = (
                        certificate["created_at"].isoformat()
                    )

                certificates.append(certificate)

            return {
                "certificates": certificates
            }

    except HTTPException:
        raise

    except Exception as e:

        print("GET CERTIFICATES ERROR:", str(e))

        raise HTTPException(
            status_code=500,
            detail=f"Failed to load certificates: {str(e)}"
        )


@app.post("/api/certificates")
def add_certificate(request: CertificateRequest):

    try:

        if not request.certificate_name.strip():

            raise HTTPException(
                status_code=400,
                detail="Certificate name is required."
            )

        if not request.issuing_organization.strip():

            raise HTTPException(
                status_code=400,
                detail="Issuing organization is required."
            )

        if not request.issue_date.strip():

            raise HTTPException(
                status_code=400,
                detail="Issue date is required."
            )

        if (
            request.expiry_date
            and request.expiry_date.strip()
            and request.issue_date.strip() > request.expiry_date.strip()
        ):

            raise HTTPException(
                status_code=400,
                detail="Expiry date cannot be before issue date."
            )

        with engine.begin() as connection:

            student_id = find_student_id(
                connection,
                request.user_id
            )

            certificate_name = request.certificate_name.strip()

            issuing_organization = (
                request.issuing_organization.strip()
            )

            issue_date = request.issue_date.strip()

            expiry_date = (
                request.expiry_date.strip()
                if request.expiry_date
                else None
            )

            credential_id = (
                request.credential_id.strip()
                if request.credential_id
                else None
            )

            certificate_url = (
                request.certificate_url.strip()
                if request.certificate_url
                else None
            )

            if expiry_date == "":
                expiry_date = None

            if credential_id == "":
                credential_id = None

            if certificate_url == "":
                certificate_url = None

            result = connection.execute(
                text("""
                    INSERT INTO certificates
                    (
                        student_id,
                        certificate_name,
                        issuing_organization,
                        issue_date,
                        expiry_date,
                        credential_id,
                        certificate_url
                    )
                    VALUES
                    (
                        :student_id,
                        :certificate_name,
                        :issuing_organization,
                        :issue_date,
                        :expiry_date,
                        :credential_id,
                        :certificate_url
                    )
                """),
                {
                    "student_id": student_id,
                    "certificate_name": certificate_name,
                    "issuing_organization": issuing_organization,
                    "issue_date": issue_date,
                    "expiry_date": expiry_date,
                    "credential_id": credential_id,
                    "certificate_url": certificate_url
                }
            )

            certificate_id = result.lastrowid

            return {
                "message": "Certificate added successfully",
                "certificate_id": certificate_id,
                "student_id": student_id
            }

    except HTTPException:
        raise

    except Exception as e:

        print("CERTIFICATE INSERT ERROR:", str(e))

        raise HTTPException(
            status_code=500,
            detail=f"Failed to add certificate: {str(e)}"
        )


@app.delete("/api/certificates/{certificate_id}")
def delete_certificate(certificate_id: int):

    try:

        with engine.begin() as connection:

            certificate = connection.execute(
                text("""
                    SELECT certificate_id
                    FROM certificates
                    WHERE certificate_id = :certificate_id
                    LIMIT 1
                """),
                {
                    "certificate_id": certificate_id
                }
            ).first()

            if not certificate:

                raise HTTPException(
                    status_code=404,
                    detail="Certificate not found."
                )

            result = connection.execute(
                text("""
                    DELETE FROM certificates
                    WHERE certificate_id = :certificate_id
                """),
                {
                    "certificate_id": certificate_id
                }
            )

            if result.rowcount == 0:

                raise HTTPException(
                    status_code=404,
                    detail="Certificate not found."
                )

            return {
                "message": "Certificate deleted successfully",
                "certificate_id": certificate_id
            }

    except HTTPException:
        raise

    except Exception as e:

        print("DELETE CERTIFICATE ERROR:", str(e))

        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete certificate: {str(e)}"
        )


# ============================================================
# RESUMES
# ============================================================

@app.get("/api/resumes/{user_id}")
def get_resumes(user_id: int):

    try:

        with engine.connect() as connection:

            student_id = find_student_id(
                connection,
                user_id
            )

            result = connection.execute(
                text("""
                    SELECT
                        resume_id,
                        student_id,
                        file_name,
                        file_url,
                        target_role,
                        version,
                        resume_score,
                        ai_generated,
                        uploaded_at
                    FROM resumes
                    WHERE student_id = :student_id
                    ORDER BY resume_id DESC
                """),
                {
                    "student_id": student_id
                }
            ).mappings().all()

            resumes = []

            for row in result:

                resume = dict(row)

                if resume.get("uploaded_at"):

                    resume["uploaded_at"] = (
                        resume["uploaded_at"].isoformat()
                    )

                if resume.get("ai_generated") is not None:

                    resume["ai_generated"] = bool(
                        resume["ai_generated"]
                    )

                resumes.append(resume)

            return resumes

    except HTTPException:
        raise

    except Exception as e:

        print(
            "GET RESUMES ERROR:",
            str(e)
        )

        raise HTTPException(
            status_code=500,
            detail=f"Failed to load resumes: {str(e)}"
        )


@app.post("/api/resumes/upload")
async def upload_resume(

    user_id: int = Form(...),

    file: UploadFile = File(...),

    target_role: Optional[str] = Form(None)

):

    try:

        with engine.connect() as connection:

            student_id = find_student_id(
                connection,
                user_id
            )

        if not file.filename:

            raise HTTPException(
                status_code=400,
                detail="No file selected."
            )

        safe_filename = os.path.basename(
            file.filename
        )

        if not safe_filename.lower().endswith(".pdf"):

            raise HTTPException(
                status_code=400,
                detail="Only PDF resume files are allowed."
            )

        os.makedirs(
            UPLOAD_DIR,
            exist_ok=True
        )

        timestamp = datetime.now().strftime(
            "%Y%m%d%H%M%S"
        )

        final_filename = (
            f"{student_id}_"
            f"{timestamp}_"
            f"{safe_filename}"
        )

        file_path = os.path.join(
            UPLOAD_DIR,
            final_filename
        )

        with open(
            file_path,
            "wb"
        ) as buffer:

            shutil.copyfileobj(
                file.file,
                buffer
            )

        file_url = (
            f"/uploads/{final_filename}"
        )

        with engine.connect() as connection:

            latest_version = connection.execute(
                text("""
                    SELECT
                        COALESCE(
                            MAX(version),
                            0
                        )
                    FROM resumes
                    WHERE student_id = :student_id
                """),
                {
                    "student_id": student_id
                }
            ).scalar()

        next_version = (
            int(latest_version or 0) + 1
        )

        with engine.begin() as connection:

            result = connection.execute(
                text("""
                    INSERT INTO resumes
                    (
                        student_id,
                        file_name,
                        file_url,
                        target_role,
                        version,
                        resume_score,
                        ai_generated
                    )
                    VALUES
                    (
                        :student_id,
                        :file_name,
                        :file_url,
                        :target_role,
                        :version,
                        :resume_score,
                        :ai_generated
                    )
                """),
                {
                    "student_id": student_id,
                    "file_name": safe_filename,
                    "file_url": file_url,
                    "target_role":
                        target_role.strip()
                        if target_role
                        else None,
                    "version": next_version,
                    "resume_score": None,
                    "ai_generated": 0
                }
            )

            resume_id = result.lastrowid

        return {

            "message":
                "Resume uploaded successfully",

            "resume_id":
                resume_id,

            "student_id":
                student_id,

            "file_name":
                safe_filename,

            "file_url":
                file_url,

            "target_role":
                target_role.strip()
                if target_role
                else None,

            "version":
                next_version
        }

    except HTTPException:
        raise

    except Exception as e:

        print(
            "RESUME UPLOAD ERROR:",
            str(e)
        )

        raise HTTPException(
            status_code=500,
            detail=f"Resume upload failed: {str(e)}"
        )


@app.delete("/api/resumes/{resume_id}")
def delete_resume(
    resume_id: int
):

    try:

        with engine.connect() as connection:

            resume = connection.execute(
                text("""
                    SELECT
                        resume_id,
                        file_url
                    FROM resumes
                    WHERE resume_id = :resume_id
                    LIMIT 1
                """),
                {
                    "resume_id": resume_id
                }
            ).mappings().first()

        if not resume:

            raise HTTPException(
                status_code=404,
                detail="Resume not found."
            )

        with engine.begin() as connection:

            connection.execute(
                text("""
                    DELETE FROM resumes
                    WHERE resume_id = :resume_id
                """),
                {
                    "resume_id": resume_id
                }
            )

        file_url = resume.get(
            "file_url"
        )

        if file_url:

            filename = os.path.basename(
                file_url
            )

            local_path = os.path.join(
                UPLOAD_DIR,
                filename
            )

            if os.path.exists(
                local_path
            ):

                try:

                    os.remove(
                        local_path
                    )

                except Exception as file_error:

                    print(
                        "Could not delete physical file:",
                        str(file_error)
                    )

        return {

            "message":
                "Resume deleted successfully",

            "resume_id":
                resume_id
        }

    except HTTPException:
        raise

    except Exception as e:

        print(
            "DELETE RESUME ERROR:",
            str(e)
        )

        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete resume: {str(e)}"
        )


# ============================================================
# ASSESSMENT RESULT
# ============================================================

class AssessmentResultRequest(BaseModel):

    user_id: int
    skill_name: str
    score: float
    feedback: Optional[str] = None


@app.post("/api/assessment-results")
def save_assessment_result(
    request: AssessmentResultRequest
):

    try:

        with engine.begin() as connection:

            student_id = find_student_id(
                connection,
                request.user_id
            )

            connection.execute(
                text("""
                    INSERT INTO assessment_results
                    (
                        student_id,
                        skill_name,
                        score,
                        feedback
                    )
                    VALUES
                    (
                        :student_id,
                        :skill_name,
                        :score,
                        :feedback
                    )
                """),
                {
                    "student_id": student_id,
                    "skill_name":
                        request.skill_name,
                    "score":
                        request.score,
                    "feedback":
                        request.feedback
                }
            )

            return {
                "message":
                    "Assessment result saved successfully"
            }

    except HTTPException:
        raise

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Assessment result failed: {str(e)}"
        )


# ============================================================
# CHATBOT
# ============================================================

class ChatRequest(BaseModel):
    user_id: int
    message: str


@app.post("/api/chat")
def chatbot(request: ChatRequest):

    try:

        with engine.connect() as connection:

            # ========================================================
            # GET USER
            # ========================================================

            user = get_user_by_id(
                connection,
                request.user_id
            )

            if not user:

                raise HTTPException(
                    status_code=404,
                    detail="User not found"
                )

            # ========================================================
            # GET STUDENT PROFILE
            # ========================================================

            profile = connection.execute(
                text("""
                    SELECT *
                    FROM student_details
                    WHERE user_id = :user_id
                    LIMIT 1
                """),
                {
                    "user_id": request.user_id
                }
            ).mappings().first()

            profile_data = (
                dict(profile)
                if profile
                else {}
            )

            # ========================================================
            # CLEAN MESSAGE
            # ========================================================

            message = (
                request.message
                .lower()
                .strip()
            )

            # ========================================================
            # 1. PROFILE
            # ========================================================

            if (
                "profile" in message
                or "my details" in message
                or "about me" in message
            ):

                return {
                    "reply": (
                        "Your profile is registered under "
                        f"{user.get('full_name', 'your account')}."
                    ),
                    "profile": profile_data
                }

            # ========================================================
            # 2. COLLEGE
            # ========================================================

            if "college" in message:

                return {
                    "reply": (
                        "Your college is "
                        f"{profile_data.get('college', 'not added yet')}."
                    )
                }

            # ========================================================
            # 3. PREFERRED ROLE
            # ========================================================

            if (
                "preferred role" in message
                or "career role" in message
                or "what role" in message
            ):

                return {
                    "reply": (
                        "Your preferred role is "
                        f"{profile_data.get('preferred_role', 'not added yet')}."
                    )
                }

            # ========================================================
            # 4. SKILLS
            # ========================================================

            if (
                "skills" in message
                or "skill" in message
                or "my skills" in message
            ):

                skills = connection.execute(
                    text("""
                        SELECT
                            s.skill_name,
                            ss.proficiency_level
                        FROM student_skills ss
                        JOIN skills s
                            ON ss.skill_id = s.skill_id
                        WHERE ss.student_id = :user_id
                        ORDER BY s.skill_name
                    """),
                    {
                        "user_id": request.user_id
                    }
                ).mappings().all()

                if not skills:

                    return {
                        "reply": (
                            "You have not added any skills yet. "
                            "Go to the Skills section and add your skills."
                        ),
                        "skills": []
                    }

                skill_text = []

                for skill in skills:

                    skill_name = skill.get(
                        "skill_name",
                        "Unknown skill"
                    )

                    level = skill.get(
                        "proficiency_level",
                        "Not specified"
                    )

                    skill_text.append(
                        f"{skill_name} ({level})"
                    )

                return {
                    "reply": (
                        "Here are your current skills:\n"
                        + "\n".join(
                            f"• {skill}"
                            for skill in skill_text
                        )
                    ),
                    "skills": [
                        dict(skill)
                        for skill in skills
                    ]
                }

            # ========================================================
            # 5. PROJECTS
            # ========================================================

            if (
                "projects" in message
                or "project" in message
                or "my projects" in message
            ):

                projects = connection.execute(
                    text("""
                        SELECT *
                        FROM projects
                        WHERE student_id = :user_id
                        ORDER BY project_id DESC
                    """),
                    {
                        "user_id": request.user_id
                    }
                ).mappings().all()

                if not projects:

                    return {
                        "reply": (
                            "You have not added any projects yet. "
                            "Go to the Projects section and add your projects."
                        ),
                        "projects": []
                    }

                project_lines = []

                for project in projects:

                    title = project.get(
                        "project_title",
                        project.get(
                            "title",
                            "Untitled Project"
                        )
                    )

                    description = project.get(
                        "description",
                        ""
                    )

                    if description:

                        project_lines.append(
                            f"• {title} - {description}"
                        )

                    else:

                        project_lines.append(
                            f"• {title}"
                        )

                return {
                    "reply": (
                        "Here are your projects:\n"
                        + "\n".join(project_lines)
                    ),
                    "projects": [
                        dict(project)
                        for project in projects
                    ]
                }

            # ========================================================
            # 6. CERTIFICATES
            # ========================================================

            if (
                "certificate" in message
                or "certificates" in message
                or "certification" in message
            ):

                certificates = connection.execute(
                    text("""
                        SELECT *
                        FROM certificates
                        WHERE student_id = :user_id
                        ORDER BY certificate_id DESC
                    """),
                    {
                        "user_id": request.user_id
                    }
                ).mappings().all()

                if not certificates:

                    return {
                        "reply": (
                            "You have not added any certificates yet."
                        ),
                        "certificates": []
                    }

                certificate_lines = []

                for certificate in certificates:

                    name = certificate.get(
                        "certificate_name",
                        certificate.get(
                            "title",
                            "Certificate"
                        )
                    )

                    certificate_lines.append(
                        f"• {name}"
                    )

                return {
                    "reply": (
                        "Here are your certificates:\n"
                        + "\n".join(certificate_lines)
                    ),
                    "certificates": [
                        dict(certificate)
                        for certificate in certificates
                    ]
                }

            # ========================================================
            # 7. RESUMES
            # ========================================================

            if (
                "resume" in message
                or "resumes" in message
                or "my cv" in message
                or "cv" in message
            ):

                resumes = connection.execute(
                    text("""
                        SELECT *
                        FROM resumes
                        WHERE student_id = :user_id
                        ORDER BY resume_id DESC
                    """),
                    {
                        "user_id": request.user_id
                    }
                ).mappings().all()

                if not resumes:

                    return {
                        "reply": (
                            "You have not uploaded any resume yet. "
                            "Go to the Resume section to upload one."
                        ),
                        "resumes": []
                    }

                resume_lines = []

                for resume in resumes:

                    file_name = resume.get(
                        "file_name",
                        "Resume"
                    )

                    target_role = resume.get(
                        "target_role"
                    )

                    if target_role:

                        resume_lines.append(
                            f"• {file_name} - {target_role}"
                        )

                    else:

                        resume_lines.append(
                            f"• {file_name}"
                        )

                return {
                    "reply": (
                        "Here are your uploaded resumes:\n"
                        + "\n".join(resume_lines)
                    ),
                    "resumes": [
                        dict(resume)
                        for resume in resumes
                    ]
                }

            # ========================================================
            # 8. APPLICATIONS
            # ========================================================

            if (
                "applications" in message
                or "application" in message
                or "jobs i applied" in message
                or "jobs applied" in message
            ):

                applications = connection.execute(
                    text("""
                        SELECT
                            a.application_id,
                            a.application_status,
                            a.match_percentage,
                            a.applied_at,
                            j.job_title,
                            j.company_name
                        FROM applications a
                        JOIN jobs j
                            ON a.job_id = j.job_id
                        WHERE a.student_id = :user_id
                        ORDER BY a.application_id DESC
                    """),
                    {
                        "user_id": request.user_id
                    }
                ).mappings().all()

                if not applications:

                    return {
                        "reply": (
                            "You have not applied to any jobs yet. "
                            "Go to Find Jobs to explore available opportunities."
                        ),
                        "applications": []
                    }

                application_lines = []

                for application in applications:

                    job_title = application.get(
                        "job_title",
                        "Job"
                    )

                    company = application.get(
                        "company_name",
                        "Company"
                    )

                    status = application.get(
                        "status",
                        "Applied"
                    )

                    application_lines.append(
                        f"• {job_title} at {company} - {status}"
                    )

                return {
                    "reply": (
                        "Here are your job applications:\n"
                        + "\n".join(application_lines)
                    ),
                    "applications": [
                        dict(application)
                        for application in applications
                    ]
                }

            # ========================================================
            # 9. SKILL GAP
            # ========================================================

            if (
                "skill gap" in message
                or "skill gaps" in message
                or "missing skills" in message
                or "skills missing" in message
            ):

                # Get student's skills
                student_skills = connection.execute(
                    text("""
                        SELECT
                            s.skill_name
                        FROM student_skills ss
                        JOIN skills s
                            ON ss.skill_id = s.skill_id
                        WHERE ss.student_id = :user_id
                    """),
                    {
                        "user_id": request.user_id
                    }
                ).mappings().all()

                student_skill_names = {
                    str(skill["skill_name"]).lower().strip()
                    for skill in student_skills
                    if skill.get("skill_name")
                }

                # Get skills from jobs the student has applied for
                required_skills = connection.execute(
                    text("""
                        SELECT DISTINCT
                            s.skill_name
                        FROM applications a
                        JOIN job_skills js
                            ON a.job_id = js.job_id
                        JOIN skills s
                            ON js.skill_id = s.skill_id
                        WHERE a.student_id = :user_id
                    """),
                    {
                        "user_id": request.user_id
                    }
                ).mappings().all()

                missing_skills = []

                for skill in required_skills:

                    skill_name = skill.get(
                        "skill_name"
                    )

                    if (
                        skill_name
                        and skill_name.lower().strip()
                        not in student_skill_names
                    ):

                        missing_skills.append(
                            skill_name
                        )

                if not required_skills:

                    return {
                        "reply": (
                            "I cannot calculate a job-based skill gap yet "
                            "because you have not applied to any jobs with "
                            "defined required skills."
                        ),
                        "skill_gap": []
                    }

                if not missing_skills:

                    return {
                        "reply": (
                            "Great! Based on the skills required by the jobs "
                            "you applied for, you currently have no major "
                            "missing skills."
                        ),
                        "skill_gap": []
                    }

                return {
                    "reply": (
                        "Based on the jobs you applied for, these skills "
                        "may need improvement:\n"
                        + "\n".join(
                            f"• {skill}"
                            for skill in missing_skills
                        )
                    ),
                    "skill_gap": missing_skills
                }

            # ========================================================
            # 10. HELP
            # ========================================================

            if (
                "help" in message
                or "what can you do" in message
                or "what do you do" in message
            ):

                return {
                    "reply": (
                        "I can help you with:\n"
                        "• Your profile\n"
                        "• Your skills\n"
                        "• Your projects\n"
                        "• Your certificates\n"
                        "• Your resumes\n"
                        "• Your job applications\n"
                        "• Your skill gap\n"
                        "• Your preferred role\n"
                        "• Your college"
                    )
                }

            # ========================================================
            # DEFAULT RESPONSE
            # ========================================================

            return {
                "reply": (
                    "I can help you with your profile, skills, "
                    "projects, certificates, resumes, applications, "
                    "skill gap and career preparation."
                )
            }

    except HTTPException:
        raise

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Chatbot error: {str(e)}"
        )



# ============================================================
# RECRUITER DASHBOARD
# ============================================================
# The recruiter is identified using users.user_id and users.role.
# No separate recruiter login table is required.
# ============================================================


def get_recruiter_by_id(connection, recruiter_id):

    recruiter = connection.execute(
        text("""
            SELECT
                user_id,
                full_name,
                email,
                role
            FROM users
            WHERE user_id = :user_id
            LIMIT 1
        """),
        {
            "user_id": recruiter_id
        }
    ).mappings().first()

    if not recruiter:

        raise HTTPException(
            status_code=404,
            detail="Recruiter account not found."
        )

    if str(recruiter.get("role", "")).strip().lower() != "recruiter":

        raise HTTPException(
            status_code=403,
            detail="Only recruiter accounts can access this resource."
        )

    return recruiter


@app.get("/api/recruiter/dashboard/{recruiter_id}")
def get_recruiter_dashboard(
    recruiter_id: int
):
    """
    Returns recruiter account information and dashboard statistics.

    The recruiter is identified from users.user_id.
    The database role must be 'recruiter'.
    """

    try:

        with engine.connect() as connection:

            recruiter = get_recruiter_by_id(
                connection,
                recruiter_id
            )

            # ----------------------------------------------------
            # JOB COUNTS
            # ----------------------------------------------------

            jobs_total = connection.execute(
                text("""
                    SELECT COUNT(*) AS count
                    FROM jobs
                    WHERE recruiter_id = :recruiter_id
                """),
                {
                    "recruiter_id": recruiter_id
                }
            ).scalar() or 0

            jobs_active = connection.execute(
                text("""
                    SELECT COUNT(*) AS count
                    FROM jobs
                    WHERE recruiter_id = :recruiter_id
                    AND LOWER(COALESCE(status, '')) = 'open'
                """),
                {
                    "recruiter_id": recruiter_id
                }
            ).scalar() or 0

            # ----------------------------------------------------
            # APPLICATION COUNT
            # ----------------------------------------------------

            applications_total = connection.execute(
                text("""
                    SELECT COUNT(*) AS count
                    FROM applications a
                    INNER JOIN jobs j
                        ON a.job_id = j.job_id
                    WHERE j.recruiter_id = :recruiter_id
                """),
                {
                    "recruiter_id": recruiter_id
                }
            ).scalar() or 0

            # ----------------------------------------------------
            # SHORTLISTED COUNT
            # ----------------------------------------------------

            shortlisted_total = connection.execute(
                text("""
                    SELECT COUNT(*) AS count
                    FROM applications a
                    INNER JOIN jobs j
                        ON a.job_id = j.job_id
                    WHERE j.recruiter_id = :recruiter_id
                    AND LOWER(COALESCE(a.application_status, '')) IN
                        ('shortlisted', 'selected')
                """),
                {
                    "recruiter_id": recruiter_id
                }
            ).scalar() or 0

            # ----------------------------------------------------
            # INTERVIEW COUNT
            # ----------------------------------------------------

            interviews_total = connection.execute(
                text("""
                    SELECT COUNT(*) AS count
                    FROM applications a
                    INNER JOIN jobs j
                        ON a.job_id = j.job_id
                    WHERE j.recruiter_id = :recruiter_id
                    AND LOWER(COALESCE(a.application_status, '')) = 'interview'
                """),
                {
                    "recruiter_id": recruiter_id
                }
            ).scalar() or 0

            # ----------------------------------------------------
            # RECENT APPLICATIONS
            # ----------------------------------------------------

            recent_rows = connection.execute(
                text("""
                    SELECT
                        a.application_id,
                        a.job_id,
                        a.student_id,
                        a.match_percentage,
                        a.application_status,
                        a.applied_at,
                        j.company_name,
                        j.job_title,
                        u.full_name AS student_name,
                        u.email AS student_email
                    FROM applications a
                    INNER JOIN jobs j
                        ON a.job_id = j.job_id
                    INNER JOIN users u
                        ON a.student_id = u.user_id
                    WHERE j.recruiter_id = :recruiter_id
                    ORDER BY a.applied_at DESC
                    LIMIT 5
                """),
                {
                    "recruiter_id": recruiter_id
                }
            ).mappings().all()

            recent_applications = []

            for row in recent_rows:

                item = dict(row)

                if item.get("applied_at"):
                    item["applied_at"] = item["applied_at"].isoformat()

                recent_applications.append(item)

            return {
                "recruiter": {
                    "user_id": recruiter["user_id"],
                    "full_name": recruiter.get("full_name"),
                    "email": recruiter.get("email"),
                    "role": "recruiter"
                },
                "stats": {
                    "jobs_posted": int(jobs_total),
                    "active_jobs": int(jobs_active),
                    "applications": int(applications_total),
                    "shortlisted": int(shortlisted_total),
                    "interviews": int(interviews_total)
                },
                "recent_applications": recent_applications
            }

    except HTTPException:
        raise

    except Exception as e:

        print(
            "RECRUITER DASHBOARD ERROR:",
            str(e)
        )

        raise HTTPException(
            status_code=500,
            detail=f"Failed to load recruiter dashboard: {str(e)}"
        )


@app.get("/api/recruiter/jobs/{recruiter_id}")
def get_recruiter_jobs(
    recruiter_id: int
):
    """Return only the jobs owned by the logged-in recruiter."""

    try:

        with engine.connect() as connection:

            get_recruiter_by_id(
                connection,
                recruiter_id
            )

            rows = connection.execute(
                text("""
                    SELECT
                        j.job_id,
                        j.recruiter_id,
                        j.company_name,
                        j.job_title,
                        j.description,
                        j.location,
                        j.job_type,
                        j.experience_required,
                        j.salary,
                        j.application_deadline,
                        j.status,
                        j.created_at,
                        COUNT(a.application_id) AS application_count
                    FROM jobs j
                    LEFT JOIN applications a
                        ON j.job_id = a.job_id
                    WHERE j.recruiter_id = :recruiter_id
                    GROUP BY
                        j.job_id,
                        j.recruiter_id,
                        j.company_name,
                        j.job_title,
                        j.description,
                        j.location,
                        j.job_type,
                        j.experience_required,
                        j.salary,
                        j.application_deadline,
                        j.status,
                        j.created_at
                    ORDER BY j.created_at DESC
                """),
                {
                    "recruiter_id": recruiter_id
                }
            ).mappings().all()

            jobs = []

            for row in rows:

                job = dict(row)

                if job.get("application_deadline"):
                    job["application_deadline"] = (
                        job["application_deadline"].isoformat()
                    )

                if job.get("created_at"):
                    job["created_at"] = (
                        job["created_at"].isoformat()
                    )

                job["application_count"] = int(
                    job.get("application_count") or 0
                )

                jobs.append(job)

            return {
                "recruiter_id": recruiter_id,
                "jobs": jobs
            }

    except HTTPException:
        raise

    except Exception as e:

        print(
            "RECRUITER JOBS ERROR:",
            str(e)
        )

        raise HTTPException(
            status_code=500,
            detail=f"Failed to load recruiter jobs: {str(e)}"
        )



# ============================================================
# ============================================================
# JOBS / POST JOB
# ============================================================
# This section matches the ACTUAL jobs table in MySQL.
#
# jobs columns:
# job_id, recruiter_id, job_title, company_name, description,
# location, job_type, work_mode, salary, experience_required,
# minimum_cgpa, application_deadline, status, created_at
#
# job_skills and job_matching_weights are optional supporting
# tables. They are used when they exist, but they are NOT required
# for the jobs table itself.
# ============================================================


class JobData(BaseModel):

    company_name: Optional[str] = None
    job_title: str
    job_type: str
    work_mode: str
    location: Optional[str] = None
    experience_required: Optional[str] = None
    openings: int = 1
    description: str
    responsibilities: Optional[str] = None
    minimum_degree: Optional[str] = None
    preferred_branches: Optional[str] = None
    minimum_cgpa: Optional[float] = None
    backlogs_allowed: bool = True
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    stipend_min: Optional[float] = None
    stipend_max: Optional[float] = None
    salary: Optional[str] = None
    application_deadline: Optional[str] = None
    expected_joining_date: Optional[str] = None
    assessment_required: bool = False
    minimum_assessment_score: float = 70.0
    status: str = "Published"


class JobSkill(BaseModel):
    skill_name: str
    skill_type: str = "Required"
    importance_weight: float = 0.0


class MatchingWeights(BaseModel):
    skills_weight: float = 40.0
    projects_weight: float = 20.0
    resume_weight: float = 15.0
    assessment_weight: float = 15.0
    certificates_weight: float = 10.0


class CreateJobRequest(BaseModel):
    recruiter_id: int
    job: JobData
    skills: list[JobSkill] = []
    matching_weights: MatchingWeights = MatchingWeights()


# ============================================================
# JOB VALUE NORMALIZATION
# ============================================================

def normalize_job_type(value: str) -> str:

    value = (value or "").strip()

    mapping = {
        "Full-Time": "Full-time",
        "Full-time": "Full-time",
        "Part-Time": "Part-time",
        "Part-time": "Part-time",
        "Internship": "Internship"
    }

    if value not in mapping:
        raise HTTPException(
            status_code=400,
            detail="Job type must be Full-time, Part-time or Internship."
        )

    return mapping[value]


def normalize_work_mode(value: str) -> str:

    value = (value or "").strip()

    mapping = {
        "On-Site": "On-site",
        "On-site": "On-site",
        "Remote": "Remote",
        "Hybrid": "Hybrid"
    }

    if value not in mapping:
        raise HTTPException(
            status_code=400,
            detail="Work mode must be On-site, Hybrid or Remote."
        )

    return mapping[value]


def normalize_job_status(value: str) -> str:

    value = (value or "").strip()

    # Your actual DB supports only Open and Closed.
    # Published is therefore stored as Open.
    if value in ["Published", "Open", "Draft"]:
        return "Open"

    if value == "Closed":
        return "Closed"

    raise HTTPException(
        status_code=400,
        detail="Job status must be Open or Closed."
    )


def make_salary_string(job: JobData) -> Optional[str]:

    if job.salary and job.salary.strip():
        return job.salary.strip()

    if job.salary_min is not None and job.salary_max is not None:
        return f"{job.salary_min:g} - {job.salary_max:g}"

    if job.salary_min is not None:
        return f"{job.salary_min:g}+"

    if job.salary_max is not None:
        return f"Up to {job.salary_max:g}"

    if job.stipend_min is not None and job.stipend_max is not None:
        return f"{job.stipend_min:g} - {job.stipend_max:g}"

    return None


# ============================================================
# GET ALL OPEN JOBS
# Used by FindJobs.jsx
# ============================================================

@app.get("/api/jobs")
def get_jobs(
    keyword: Optional[str] = None,
    location: Optional[str] = None,
    job_type: Optional[str] = None,
    user_id: Optional[int] = None
):
    """Return open/published jobs as an ARRAY for FindJobs.jsx."""
    try:
        with engine.connect() as connection:
            has_skills_table = table_exists(connection, "job_skills")

            if has_skills_table:
                skills_select = """
                    , GROUP_CONCAT(
                        DISTINCT js.skill_name
                        ORDER BY js.skill_name
                        SEPARATOR ', '
                    ) AS skills
                """
                skills_join = "LEFT JOIN job_skills js ON js.job_id = j.job_id"
                skills_group = """
                    GROUP BY
                        j.job_id, j.recruiter_id, j.job_title, j.company_name,
                        j.description, j.location, j.job_type, j.work_mode,
                        j.salary, j.experience_required, j.minimum_cgpa,
                        j.application_deadline, j.status, j.created_at,
                        u.full_name
                """
            else:
                skills_select = ", NULL AS skills"
                skills_join = ""
                skills_group = ""

            query = f"""
                SELECT
                    j.job_id,
                    j.recruiter_id,
                    j.job_title,
                    j.company_name,
                    j.description,
                    j.location,
                    j.job_type,
                    j.work_mode,
                    j.salary,
                    j.experience_required,
                    j.minimum_cgpa,
                    j.application_deadline,
                    j.status,
                    j.created_at,
                    u.full_name AS recruiter_name
                    {skills_select}
                FROM jobs j
                LEFT JOIN users u ON j.recruiter_id = u.user_id
                {skills_join}
                WHERE j.status = 'Open'
                  AND (:keyword IS NULL OR
                       j.job_title LIKE :keyword_like OR
                       j.company_name LIKE :keyword_like OR
                       j.description LIKE :keyword_like OR
                       COALESCE(j.job_id, 0) IN (
                           SELECT js2.job_id FROM job_skills js2
                           WHERE js2.skill_name LIKE :keyword_like
                       ) OR :no_skill_table = 1)
                  AND (:location IS NULL OR j.location LIKE :location_like)
                  AND (:job_type IS NULL OR LOWER(j.job_type) = LOWER(:job_type))
                {skills_group}
                ORDER BY j.created_at DESC
            """

            # If job_skills is absent, avoid referring to it in the keyword filter.
            if not has_skills_table:
                query = query.replace(
                    """COALESCE(j.job_id, 0) IN (
                           SELECT js2.job_id FROM job_skills js2
                           WHERE js2.skill_name LIKE :keyword_like
                       ) OR :no_skill_table = 1""",
                    "1 = 1"
                )

            keyword_value = keyword.strip() if keyword and keyword.strip() else None
            location_value = location.strip() if location and location.strip() else None
            job_type_value = job_type.strip() if job_type and job_type.strip() else None

            params = {
                "keyword": keyword_value,
                "keyword_like": f"%{keyword_value}%" if keyword_value else None,
                "location": location_value,
                "location_like": f"%{location_value}%" if location_value else None,
                "job_type": job_type_value,
                "no_skill_table": 0 if has_skills_table else 1,
            }

            rows = connection.execute(text(query), params).mappings().all()
            jobs = []
            for row in rows:
                job = dict(row)
                for date_field in ("application_deadline", "created_at"):
                    if job.get(date_field) is not None:
                        job[date_field] = job[date_field].isoformat()
                jobs.append(job)

            # FindJobs.jsx currently expects a raw array, not {success, count, jobs}.
            return jobs

    except Exception as e:
        print("GET JOBS ERROR:", str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Failed to load jobs: {str(e)}"
        )


# ============================================================
# CREATE / POST JOB
# ============================================================

@app.post("/api/jobs")
def create_job(request: CreateJobRequest):

    try:

        recruiter_id = request.recruiter_id
        job = request.job

        if not job.job_title.strip():
            raise HTTPException(
                status_code=400,
                detail="Job title is required."
            )

        if not job.description.strip():
            raise HTTPException(
                status_code=400,
                detail="Job description is required."
            )

        if job.minimum_cgpa is not None and not 0 <= job.minimum_cgpa <= 10:
            raise HTTPException(
                status_code=400,
                detail="Minimum CGPA must be between 0 and 10."
            )

        job_type = normalize_job_type(job.job_type)
        work_mode = normalize_work_mode(job.work_mode)
        status = normalize_job_status(job.status)

        with engine.connect() as connection:

            recruiter = connection.execute(
                text("""
                    SELECT user_id, full_name, role
                    FROM users
                    WHERE user_id = :user_id
                    LIMIT 1
                """),
                {"user_id": recruiter_id}
            ).mappings().first()

        if not recruiter:
            raise HTTPException(
                status_code=404,
                detail="Recruiter account not found."
            )

        if str(recruiter["role"]).strip().lower() != "recruiter":
            raise HTTPException(
                status_code=403,
                detail="Only recruiters can post jobs."
            )

        company_name = (
            job.company_name.strip()
            if job.company_name and job.company_name.strip()
            else str(recruiter.get("full_name") or "ElectroHire Company").strip()
        )

        salary = make_salary_string(job)

        with engine.begin() as connection:

            result = connection.execute(
                text("""
                    INSERT INTO jobs
                    (
                        recruiter_id,
                        job_title,
                        company_name,
                        description,
                        location,
                        job_type,
                        work_mode,
                        salary,
                        experience_required,
                        minimum_cgpa,
                        application_deadline,
                        status
                    )
                    VALUES
                    (
                        :recruiter_id,
                        :job_title,
                        :company_name,
                        :description,
                        :location,
                        :job_type,
                        :work_mode,
                        :salary,
                        :experience_required,
                        :minimum_cgpa,
                        :application_deadline,
                        :status
                    )
                """),
                {
                    "recruiter_id": recruiter_id,
                    "job_title": job.job_title.strip(),
                    "company_name": company_name,
                    "description": job.description.strip(),
                    "location": (
                        job.location.strip()
                        if job.location
                        else None
                    ),
                    "job_type": job_type,
                    "work_mode": work_mode,
                    "salary": salary,
                    "experience_required": (
                        job.experience_required.strip()
                        if job.experience_required
                        else None
                    ),
                    "minimum_cgpa": job.minimum_cgpa,
                    "application_deadline": job.application_deadline,
                    "status": status
                }
            )

            job_id = result.lastrowid

            # Keep a separate publication record for the Publish Job flow.
            # The jobs table remains the source of truth for Manage Jobs because
            # it contains the Open/Closed status and application information.
            if table_exists(connection, "published_posts"):
                connection.execute(
                    text("""
                        INSERT INTO published_posts
                        (
                            job_id,
                            recruiter_id,
                            job_title,
                            company_name,
                            description,
                            location,
                            job_type,
                            work_mode,
                            salary,
                            experience_required,
                            minimum_cgpa,
                            application_deadline
                        )
                        VALUES
                        (
                            :job_id,
                            :recruiter_id,
                            :job_title,
                            :company_name,
                            :description,
                            :location,
                            :job_type,
                            :work_mode,
                            :salary,
                            :experience_required,
                            :minimum_cgpa,
                            :application_deadline
                        )
                    """),
                    {
                        "job_id": job_id,
                        "recruiter_id": recruiter_id,
                        "job_title": job.job_title.strip(),
                        "company_name": company_name,
                        "description": job.description.strip(),
                        "location": job.location.strip() if job.location else None,
                        "job_type": job_type,
                        "work_mode": work_mode,
                        "salary": salary,
                        "experience_required": (
                            job.experience_required.strip()
                            if job.experience_required
                            else None
                        ),
                        "minimum_cgpa": job.minimum_cgpa,
                        "application_deadline": job.application_deadline
                    }
                )

            # Supporting tables are optional.
            if table_exists(connection, "job_skills"):

                seen = set()

                for skill in request.skills:

                    skill_name = skill.skill_name.strip()
                    skill_type = skill.skill_type.strip()

                    if not skill_name:
                        continue

                    if skill_type not in ["Required", "Preferred"]:
                        continue

                    key = (skill_name.lower(), skill_type.lower())

                    if key in seen:
                        continue

                    seen.add(key)

                    connection.execute(
                        text("""
                            INSERT INTO job_skills
                            (
                                job_id,
                                skill_name,
                                skill_type,
                                importance_weight
                            )
                            VALUES
                            (
                                :job_id,
                                :skill_name,
                                :skill_type,
                                :importance_weight
                            )
                        """),
                        {
                            "job_id": job_id,
                            "skill_name": skill_name,
                            "skill_type": skill_type,
                            "importance_weight": skill.importance_weight
                        }
                    )

            if table_exists(connection, "job_matching_weights"):

                matching = request.matching_weights

                weights = [
                    matching.skills_weight,
                    matching.projects_weight,
                    matching.resume_weight,
                    matching.assessment_weight,
                    matching.certificates_weight
                ]

                if all(0 <= float(w) <= 100 for w in weights):

                    connection.execute(
                        text("""
                            INSERT INTO job_matching_weights
                            (
                                job_id,
                                skills_weight,
                                projects_weight,
                                resume_weight,
                                assessment_weight,
                                certificates_weight
                            )
                            VALUES
                            (
                                :job_id,
                                :skills_weight,
                                :projects_weight,
                                :resume_weight,
                                :assessment_weight,
                                :certificates_weight
                            )
                        """),
                        {
                            "job_id": job_id,
                            "skills_weight": matching.skills_weight,
                            "projects_weight": matching.projects_weight,
                            "resume_weight": matching.resume_weight,
                            "assessment_weight": matching.assessment_weight,
                            "certificates_weight": matching.certificates_weight
                        }
                    )

        return {
            "success": True,
            "message": "Job posted successfully.",
            "job_id": job_id,
            "recruiter_id": recruiter_id,
            "status": status
        }

    except HTTPException:
        raise

    except Exception as e:

        print("CREATE JOB ERROR:", str(e))

        raise HTTPException(
            status_code=500,
            detail=f"Failed to create job: {str(e)}"
        )


# ============================================================
# GET JOBS POSTED BY RECRUITER
# THIS IS THE ENDPOINT USED BY ManageJobs.jsx
# ============================================================

@app.get("/api/jobs/recruiter/{recruiter_id}")
def get_recruiter_jobs(recruiter_id: int):

    try:

        with engine.connect() as connection:

            recruiter = connection.execute(
                text("""
                    SELECT user_id, full_name, email, role
                    FROM users
                    WHERE user_id = :user_id
                    LIMIT 1
                """),
                {"user_id": recruiter_id}
            ).mappings().first()

            if not recruiter:
                raise HTTPException(
                    status_code=404,
                    detail="Recruiter not found."
                )

            if str(recruiter["role"]).strip().lower() != "recruiter":
                raise HTTPException(
                    status_code=403,
                    detail="Only recruiters can access recruiter jobs."
                )

            rows = connection.execute(
                text("""
                    SELECT
                        j.job_id,
                        j.recruiter_id,
                        j.job_title,
                        j.company_name,
                        j.description,
                        j.location,
                        j.job_type,
                        j.work_mode,
                        j.salary,
                        j.experience_required,
                        j.minimum_cgpa,
                        j.application_deadline,
                        j.status,
                        j.created_at,
                        COUNT(a.application_id) AS applications_count,
                        SUM(
                            CASE
                                WHEN LOWER(COALESCE(a.application_status, '')) = 'shortlisted'
                                THEN 1
                                ELSE 0
                            END
                        ) AS shortlisted_count
                    FROM jobs j
                    LEFT JOIN applications a
                        ON j.job_id = a.job_id
                    WHERE j.recruiter_id = :recruiter_id
                    GROUP BY
                        j.job_id,
                        j.recruiter_id,
                        j.job_title,
                        j.company_name,
                        j.description,
                        j.location,
                        j.job_type,
                        j.work_mode,
                        j.salary,
                        j.experience_required,
                        j.minimum_cgpa,
                        j.application_deadline,
                        j.status,
                        j.created_at
                    ORDER BY j.created_at DESC
                """),
                {"recruiter_id": recruiter_id}
            ).mappings().all()

            final_jobs = []

            for row in rows:

                job = dict(row)

                if job.get("application_deadline") is not None:
                    job["application_deadline"] = (
                        job["application_deadline"].isoformat()
                    )

                if job.get("created_at") is not None:
                    job["created_at"] = (
                        job["created_at"].isoformat()
                    )

                job["applications_count"] = int(
                    job.get("applications_count") or 0
                )

                job["shortlisted_count"] = int(
                    job.get("shortlisted_count") or 0
                )

                # Optional supporting data.
                if table_exists(connection, "job_skills"):

                    skills = connection.execute(
                        text("""
                            SELECT
                                job_skill_id,
                                job_id,
                                skill_name,
                                skill_type,
                                importance_weight
                            FROM job_skills
                            WHERE job_id = :job_id
                            ORDER BY skill_type, skill_name
                        """),
                        {"job_id": row["job_id"]}
                    ).mappings().all()

                    job["skills"] = [dict(skill) for skill in skills]
                else:
                    job["skills"] = []

                if table_exists(connection, "job_matching_weights"):

                    weights = connection.execute(
                        text("""
                            SELECT
                                job_id,
                                skills_weight,
                                projects_weight,
                                resume_weight,
                                assessment_weight,
                                certificates_weight
                            FROM job_matching_weights
                            WHERE job_id = :job_id
                            LIMIT 1
                        """),
                        {"job_id": row["job_id"]}
                    ).mappings().first()

                    job["matching_weights"] = (
                        dict(weights) if weights else None
                    )
                else:
                    job["matching_weights"] = None

                final_jobs.append(job)

            return {
                "success": True,
                "recruiter_id": recruiter_id,
                "count": len(final_jobs),
                "jobs": final_jobs
            }

    except HTTPException:
        raise

    except Exception as e:

        print("GET RECRUITER JOBS ERROR:", str(e))

        raise HTTPException(
            status_code=500,
            detail=f"Failed to load recruiter jobs: {str(e)}"
        )


# ============================================================
# GET SINGLE JOB
# ============================================================

@app.get("/api/jobs/{job_id}")
def get_job(job_id: int):
    """Return one job directly, matching the current FindJobs.jsx expectations."""
    try:
        with engine.connect() as connection:
            has_skills_table = table_exists(connection, "job_skills")

            if has_skills_table:
                skills_select = """
                    , (
                        SELECT GROUP_CONCAT(
                            DISTINCT js.skill_name
                            ORDER BY js.skill_name
                            SEPARATOR ', '
                        )
                        FROM job_skills js
                        WHERE js.job_id = j.job_id
                    ) AS skills
                """
            else:
                skills_select = ", NULL AS skills"

            job = connection.execute(
                text(f"""
                    SELECT
                        j.job_id,
                        j.recruiter_id,
                        j.job_title,
                        j.company_name,
                        j.description,
                        j.location,
                        j.job_type,
                        j.work_mode,
                        j.salary,
                        j.experience_required,
                        j.minimum_cgpa,
                        j.application_deadline,
                        j.status,
                        j.created_at,
                        u.full_name AS recruiter_name,
                        u.email AS recruiter_email
                        {skills_select}
                    FROM jobs j
                    LEFT JOIN users u ON j.recruiter_id = u.user_id
                    WHERE j.job_id = :job_id
                    LIMIT 1
                """),
                {"job_id": job_id}
            ).mappings().first()

            if not job:
                raise HTTPException(status_code=404, detail="Job not found.")

            job_data = dict(job)
            for date_field in ("application_deadline", "created_at"):
                if job_data.get(date_field) is not None:
                    job_data[date_field] = job_data[date_field].isoformat()

            # FindJobs.jsx reads selectedJob.job_title directly.
            return job_data

    except HTTPException:
        raise
    except Exception as e:
        print("GET JOB ERROR:", str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Failed to load job: {str(e)}"
        )


# ============================================================
# CLOSE JOB
# ============================================================

@app.put("/api/jobs/{job_id}/close")
def close_job(job_id: int, recruiter_id: int):

    try:

        with engine.begin() as connection:

            job = connection.execute(
                text("""
                    SELECT job_id, recruiter_id, status
                    FROM jobs
                    WHERE job_id = :job_id
                    LIMIT 1
                """),
                {"job_id": job_id}
            ).mappings().first()

            if not job:
                raise HTTPException(
                    status_code=404,
                    detail="Job not found."
                )

            if int(job["recruiter_id"]) != int(recruiter_id):
                raise HTTPException(
                    status_code=403,
                    detail="You are not authorized to close this job."
                )

            connection.execute(
                text("""
                    UPDATE jobs
                    SET status = 'Closed'
                    WHERE job_id = :job_id
                """),
                {"job_id": job_id}
            )

            return {
                "success": True,
                "message": "Job closed successfully.",
                "job_id": job_id,
                "status": "Closed"
            }

    except HTTPException:
        raise

    except Exception as e:

        print("CLOSE JOB ERROR:", str(e))

        raise HTTPException(
            status_code=500,
            detail=f"Failed to close job: {str(e)}"
        )


# ============================================================
# DELETE JOB
# ============================================================

@app.delete("/api/jobs/{job_id}")
def delete_job(job_id: int, recruiter_id: int):

    try:

        with engine.begin() as connection:

            job = connection.execute(
                text("""
                    SELECT job_id, recruiter_id
                    FROM jobs
                    WHERE job_id = :job_id
                    LIMIT 1
                """),
                {"job_id": job_id}
            ).mappings().first()

            if not job:
                raise HTTPException(
                    status_code=404,
                    detail="Job not found."
                )

            if int(job["recruiter_id"]) != int(recruiter_id):
                raise HTTPException(
                    status_code=403,
                    detail="You are not authorized to delete this job."
                )

            connection.execute(
                text("""
                    DELETE FROM jobs
                    WHERE job_id = :job_id
                """),
                {"job_id": job_id}
            )

            return {
                "success": True,
                "message": "Job deleted successfully.",
                "job_id": job_id
            }

    except HTTPException:
        raise

    except Exception as e:

        print("DELETE JOB ERROR:", str(e))

        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete job: {str(e)}"
        )


#                    APPLICATIONS
# ============================================================
# ============================================================


# ============================================================
# APPLICATION REQUEST
# ============================================================

class ApplicationRequest(BaseModel):

    student_id: int
    job_id: int

    resume_id: Optional[int] = None



# ============================================================
# APPLY FOR JOB
# ============================================================

@app.post("/api/applications")
def apply_for_job(
    request: ApplicationRequest
):

    try:

        with engine.begin() as connection:

            # ------------------------------------------------
            # Verify student
            # ------------------------------------------------

            student_id = find_student_id(
                connection,
                request.student_id
            )

            # ------------------------------------------------
            # Verify job
            # ------------------------------------------------

            job = connection.execute(
                text("""
                    SELECT
                        job_id,
                        status
                    FROM jobs
                    WHERE job_id = :job_id
                    LIMIT 1
                """),
                {
                    "job_id": request.job_id
                }
            ).mappings().first()

            if not job:

                raise HTTPException(
                    status_code=404,
                    detail="Job not found."
                )

            if str(
                job["status"]
            ).lower() != "open":

                raise HTTPException(
                    status_code=400,
                    detail="This job is no longer accepting applications."
                )

            # ------------------------------------------------
            # Check duplicate application
            # ------------------------------------------------

            existing = connection.execute(
                text("""
                    SELECT application_id
                    FROM applications
                    WHERE student_id = :student_id
                    AND job_id = :job_id
                    LIMIT 1
                """),
                {
                    "student_id": student_id,
                    "job_id": request.job_id
                }
            ).first()

            if existing:

                raise HTTPException(
                    status_code=400,
                    detail="You have already applied for this job."
                )

            # ------------------------------------------------
            # Verify resume if supplied
            # ------------------------------------------------

            if request.resume_id is not None:

                resume = connection.execute(
                    text("""
                        SELECT resume_id
                        FROM resumes
                        WHERE resume_id = :resume_id
                        AND student_id = :student_id
                        LIMIT 1
                    """),
                    {
                        "resume_id": request.resume_id,
                        "student_id": student_id
                    }
                ).first()

                if not resume:

                    raise HTTPException(
                        status_code=404,
                        detail=(
                            "Selected resume was not found "
                            "for this student."
                        )
                    )

            # ------------------------------------------------
            # Insert application
            # ------------------------------------------------

            result = connection.execute(
                text("""
                    INSERT INTO applications
                    (
                        job_id,
                        student_id,
                        resume_id,
                        match_percentage,
                        application_status,
                        applied_at,
                        updated_at
                    )
                    VALUES
                    (
                        :job_id,
                        :student_id,
                        :resume_id,
                        :match_percentage,
                        :application_status,
                        NOW(),
                        NOW()
                    )
                """),
                {
                    "job_id": request.job_id,
                    "student_id": student_id,
                    "resume_id": request.resume_id,
                    "match_percentage": None,
                    "application_status": "Applied"
                }
            )

            application_id = result.lastrowid

            return {
                "message": "Application submitted successfully",
                "application_id": application_id,
                "job_id": request.job_id,
                "student_id": student_id,
                "status": "Applied"
            }

    except HTTPException:
        raise

    except Exception as e:

        print(
            "APPLICATION ERROR:",
            str(e)
        )

        raise HTTPException(
            status_code=500,
            detail=f"Failed to submit application: {str(e)}"
        )


# ============================================================
# GET STUDENT APPLICATIONS
#
# Used by Applications.jsx
# ============================================================

@app.get("/api/applications/{student_id}")
def get_student_applications(
    student_id: int
):

    try:

        with engine.connect() as connection:

            actual_student_id = find_student_id(
                connection,
                student_id
            )

            result = connection.execute(
                text("""
                    SELECT
                        a.application_id,
                        a.job_id,
                        a.student_id,
                        a.resume_id,
                        a.match_percentage,
                        a.application_status,
                        a.applied_at,

                        j.company_name,
                        j.job_title,
                        j.location,
                        j.job_type,
                        j.salary,
                        j.application_deadline

                    FROM applications a

                    JOIN jobs j
                        ON a.job_id = j.job_id

                    WHERE a.student_id = :student_id

                    ORDER BY a.applied_at DESC
                """),
                {
                    "student_id": actual_student_id
                }
            ).mappings().all()

            applications = []

            for row in result:

                application = dict(row)

                if application.get("applied_at"):

                    application["applied_at"] = (
                        application["applied_at"].isoformat()
                    )

                if application.get("application_deadline"):

                    application["application_deadline"] = (
                        application["application_deadline"].isoformat()
                    )

                applications.append(application)

            return {
                "applications": applications
            }

    except HTTPException:
        raise

    except Exception as e:

        print(
            "GET APPLICATIONS ERROR:",
            str(e)
        )

        raise HTTPException(
            status_code=500,
            detail=f"Failed to load applications: {str(e)}"
        )


# ============================================================
# GET SINGLE APPLICATION
# ============================================================

@app.get("/api/application/{application_id}")
def get_application(
    application_id: int
):

    try:

        with engine.connect() as connection:

            application = connection.execute(
                text("""
                    SELECT
                        a.application_id,
                        a.job_id,
                        a.student_id,
                        a.resume_id,
                        a.match_percentage,
                        a.application_status,
                        a.applied_at,

                        j.company_name,
                        j.job_title,
                        j.description,
                        j.location,
                        j.job_type,
                        j.experience_required,
                        j.salary,
                        j.application_deadline

                    FROM applications a

                    JOIN jobs j
                        ON a.job_id = j.job_id

                    WHERE a.application_id = :application_id

                    LIMIT 1
                """),
                {
                    "application_id": application_id
                }
            ).mappings().first()

            if not application:

                raise HTTPException(
                    status_code=404,
                    detail="Application not found."
                )

            data = dict(application)

            if data.get("applied_at"):

                data["applied_at"] = (
                    data["applied_at"].isoformat()
                )

            if data.get("application_deadline"):

                data["application_deadline"] = (
                    data["application_deadline"].isoformat()
                )

            # ------------------------------------------------
            # Get application score
            # ------------------------------------------------

            score = connection.execute(
                text("""
                    SELECT *
                    FROM application_scores
                    WHERE application_id = :application_id
                    ORDER BY application_score_id DESC
                    LIMIT 1
                """),
                {
                    "application_id": application_id
                }
            ).mappings().first()

            data["score"] = (
                dict(score)
                if score
                else None
            )

            # ------------------------------------------------
            # Get interview
            # ------------------------------------------------

            interview = connection.execute(
                text("""
                    SELECT *
                    FROM interviews
                    WHERE application_id = :application_id
                    ORDER BY interview_id DESC
                    LIMIT 1
                """),
                {
                    "application_id": application_id
                }
            ).mappings().first()

            if interview:

                interview_data = dict(interview)

                if interview_data.get(
                    "interview_date"
                ):

                    interview_data[
                        "interview_date"
                    ] = (
                        interview_data[
                            "interview_date"
                        ].isoformat()
                    )

                if interview_data.get(
                    "created_at"
                ):

                    interview_data[
                        "created_at"
                    ] = (
                        interview_data[
                            "created_at"
                        ].isoformat()
                    )

                data["interview"] = interview_data

            else:

                data["interview"] = None

            return data

    except HTTPException:
        raise

    except Exception as e:

        print(
            "GET APPLICATION ERROR:",
            str(e)
        )

        raise HTTPException(
            status_code=500,
            detail=f"Failed to load application: {str(e)}"
        )


# ============================================================
# WITHDRAW APPLICATION
# ============================================================

@app.delete("/api/applications/{application_id}")
def withdraw_application(
    application_id: int
):

    try:

        with engine.begin() as connection:

            application = connection.execute(
                text("""
                    SELECT application_id
                    FROM applications
                    WHERE application_id = :application_id
                    LIMIT 1
                """),
                {
                    "application_id": application_id
                }
            ).first()

            if not application:

                raise HTTPException(
                    status_code=404,
                    detail="Application not found."
                )

            connection.execute(
                text("""
                    UPDATE applications
                    SET application_status = 'Withdrawn', updated_at = NOW()
                    WHERE application_id = :application_id
                """),
                {
                    "application_id": application_id
                }
            )

            return {
                "message": "Application withdrawn successfully",
                "application_id": application_id,
                "status": "Withdrawn"
            }

    except HTTPException:
        raise

    except Exception as e:

        print(
            "WITHDRAW APPLICATION ERROR:",
            str(e)
        )

        raise HTTPException(
            status_code=500,
            detail=f"Failed to withdraw application: {str(e)}"
        )


# ============================================================
# UPDATE APPLICATION STATUS
#
# Recruiter can use:
#
# Applied
# Under Review
# Shortlisted
# Interview
# Selected
# Rejected
# Withdrawn
# ============================================================

class ApplicationStatusRequest(BaseModel):

    status: str


@app.put("/api/applications/{application_id}/status")
def update_application_status(
    application_id: int,
    request: ApplicationStatusRequest
):

    allowed_statuses = [
        "Applied",
        "Under Review",
        "Shortlisted",
        "Interview",
        "Selected",
        "Rejected",
        "Withdrawn"
    ]

    if request.status not in allowed_statuses:

        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid application status. "
                f"Allowed values: {allowed_statuses}"
            )
        )

    try:

        with engine.begin() as connection:

            application = connection.execute(
                text("""
                    SELECT application_id
                    FROM applications
                    WHERE application_id = :application_id
                    LIMIT 1
                """),
                {
                    "application_id": application_id
                }
            ).first()

            if not application:

                raise HTTPException(
                    status_code=404,
                    detail="Application not found."
                )

            connection.execute(
                text("""
                    UPDATE applications
                    SET application_status = :status, updated_at = NOW()
                    WHERE application_id = :application_id
                """),
                {
                    "application_id": application_id,
                    "status": request.status
                }
            )

            return {
                "message": "Application status updated successfully",
                "application_id": application_id,
                "status": request.status
            }

    except HTTPException:
        raise

    except Exception as e:

        print(
            "UPDATE APPLICATION STATUS ERROR:",
            str(e)
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to update application status: "
                f"{str(e)}"
            )
        )


# ============================================================
# RECRUITER: GET ALL APPLICANTS FOR A JOB
# ============================================================

@app.get("/api/jobs/{job_id}/applications")
def get_job_applications(
    job_id: int
):

    try:

        with engine.connect() as connection:

            job = connection.execute(
                text("""
                    SELECT
                        job_id,
                        recruiter_id
                    FROM jobs
                    WHERE job_id = :job_id
                    LIMIT 1
                """),
                {
                    "job_id": job_id
                }
            ).mappings().first()

            if not job:

                raise HTTPException(
                    status_code=404,
                    detail="Job not found."
                )

            result = connection.execute(
                text("""
                    SELECT
                        a.application_id,
                        a.job_id,
                        a.student_id,
                        a.resume_id,
                        a.match_percentage,
                        a.application_status,
                        a.applied_at,

                        u.full_name,
                        u.email,

                        sd.college,
                        sd.degree,
                        sd.branch,
                        sd.year,
                        sd.semester,
                        sd.cgpa,
                        sd.location,
                        sd.preferred_role,

                        r.file_name,
                        r.file_url

                    FROM applications a

                    JOIN users u
                        ON a.student_id = u.user_id

                    LEFT JOIN student_details sd
                        ON a.student_id = sd.user_id

                    LEFT JOIN resumes r
                        ON a.resume_id = r.resume_id

                    WHERE a.job_id = :job_id

                    ORDER BY
                        a.match_percentage DESC,
                        a.applied_at DESC
                """),
                {
                    "job_id": job_id
                }
            ).mappings().all()

            applicants = []

            for row in result:

                applicant = dict(row)

                if applicant.get("applied_at"):

                    applicant["applied_at"] = (
                        applicant["applied_at"].isoformat()
                    )

                applicants.append(applicant)

            return {
                "job_id": job_id,
                "applicants": applicants
            }

    except HTTPException:
        raise

    except Exception as e:

        print(
            "GET JOB APPLICATIONS ERROR:",
            str(e)
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to load job applications: "
                f"{str(e)}"
            )
        )


# ============================================================
# APPLICATION MATCH SCORE
# ============================================================

class ApplicationScoreRequest(BaseModel):

    skills_score: float = 0
    projects_score: float = 0
    resume_score: float = 0
    assessment_score: float = 0
    education_score: float = 0


@app.post("/api/applications/{application_id}/score")
def calculate_application_score(
    application_id: int,
    request: ApplicationScoreRequest
):

    try:

        # ----------------------------------------------------
        # Calculate weighted score
        #
        # Skills       = 30%
        # Projects     = 20%
        # Resume       = 20%
        # Assessment   = 20%
        # Education    = 10%
        # ----------------------------------------------------

        overall_score = (
            (request.skills_score * 0.30)
            + (request.projects_score * 0.20)
            + (request.resume_score * 0.20)
            + (request.assessment_score * 0.20)
            + (request.education_score * 0.10)
        )

        overall_score = round(
            overall_score,
            2
        )

        with engine.begin() as connection:

            application = connection.execute(
                text("""
                    SELECT application_id
                    FROM applications
                    WHERE application_id = :application_id
                    LIMIT 1
                """),
                {
                    "application_id": application_id
                }
            ).first()

            if not application:

                raise HTTPException(
                    status_code=404,
                    detail="Application not found."
                )

            # ------------------------------------------------
            # Save score details
            # ------------------------------------------------

            result = connection.execute(
                text("""
                    INSERT INTO application_scores
                    (
                        application_id,
                        skills_score,
                        projects_score,
                        resume_score,
                        assessment_score,
                        education_score,
                        overall_score
                    )
                    VALUES
                    (
                        :application_id,
                        :skills_score,
                        :projects_score,
                        :resume_score,
                        :assessment_score,
                        :education_score,
                        :overall_score
                    )
                """),
                {
                    "application_id":
                        application_id,
                    "skills_score":
                        request.skills_score,
                    "projects_score":
                        request.projects_score,
                    "resume_score":
                        request.resume_score,
                    "assessment_score":
                        request.assessment_score,
                    "education_score":
                        request.education_score,
                    "overall_score":
                        overall_score
                }
            )

            # ------------------------------------------------
            # Update main application match score
            # ------------------------------------------------

            connection.execute(
                text("""
                    UPDATE applications
                    SET match_percentage = :match_score, updated_at = NOW()
                    WHERE application_id = :application_id
                """),
                {
                    "application_id":
                        application_id,
                    "match_score":
                        overall_score
                }
            )

            return {
                "message":
                    "Application score calculated successfully",

                "application_id":
                    application_id,

                "skills_score":
                    request.skills_score,

                "projects_score":
                    request.projects_score,

                "resume_score":
                    request.resume_score,

                "assessment_score":
                    request.assessment_score,

                "education_score":
                    request.education_score,

                "overall_score":
                    overall_score
            }

    except HTTPException:
        raise

    except Exception as e:

        print(
            "APPLICATION SCORE ERROR:",
            str(e)
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to calculate application score: "
                f"{str(e)}"
            )
        )


# ============================================================
# RECRUITER PROFILE
# ============================================================


# ============================================================
# RECRUITER PROFILE REQUEST MODEL
# ============================================================

class RecruiterProfileRequest(BaseModel):

    company_name: Optional[str] = None

    designation: Optional[str] = None

    phone: Optional[str] = None

    company_website: Optional[str] = None

    company_linkedin: Optional[str] = None

    industry: Optional[str] = None

    company_size: Optional[str] = None

    location: Optional[str] = None

    company_description: Optional[str] = None


# ============================================================
# GET RECRUITER PROFILE
# ============================================================

@app.get("/api/recruiter-profile/{user_id}")
def get_recruiter_profile(
    user_id: int
):

    try:

        with engine.connect() as connection:

            # ------------------------------------------------
            # CHECK USER
            # ------------------------------------------------

            user = get_user_by_id(
                connection,
                user_id
            )

            if not user:

                raise HTTPException(
                    status_code=404,
                    detail="User not found"
                )


            # ------------------------------------------------
            # CHECK USER ROLE
            # ------------------------------------------------

            role = str(
                user.get("role", "")
            ).lower()


            if role != "recruiter":

                raise HTTPException(
                    status_code=403,
                    detail=(
                        "This profile belongs to a recruiter only."
                    )
                )


            # ------------------------------------------------
            # CHECK RECRUITER DETAILS TABLE
            # ------------------------------------------------

            if not table_exists(
                connection,
                "recruiter_details"
            ):

                raise HTTPException(
                    status_code=500,
                    detail=(
                        "recruiter_details table does not exist. "
                        "Please create the recruiter_details table "
                        "in MySQL first."
                    )
                )


            # ------------------------------------------------
            # GET RECRUITER DETAILS
            # ------------------------------------------------

            details = connection.execute(
                text("""
                    SELECT
                        user_id,
                        company_name,
                        designation,
                        phone,
                        company_website,
                        company_linkedin,
                        industry,
                        company_size,
                        location,
                        company_description,
                        created_at,
                        updated_at
                    FROM recruiter_details
                    WHERE user_id = :user_id
                    LIMIT 1
                """),
                {
                    "user_id": user_id
                }
            ).mappings().first()


            # ------------------------------------------------
            # DEFAULT PROFILE
            # ------------------------------------------------

            profile = {

                "user_id": user["user_id"],

                "email": user.get("email"),

                "full_name": user.get("full_name"),

                "role": user.get("role"),

                "company_name": None,

                "designation": None,

                "phone": None,

                "company_website": None,

                "company_linkedin": None,

                "industry": None,

                "company_size": None,

                "location": None,

                "company_description": None,

                "created_at": None,

                "updated_at": None
            }


            # ------------------------------------------------
            # ADD DATABASE DETAILS
            # ------------------------------------------------

            if details:

                for key, value in details.items():

                    if key in profile:

                        profile[key] = value


            # ------------------------------------------------
            # RETURN PROFILE
            # ------------------------------------------------

            return profile


    except HTTPException:

        raise


    except Exception as e:

        print(
            "RECRUITER PROFILE LOAD ERROR:",
            str(e)
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Recruiter profile loading failed: "
                f"{str(e)}"
            )
        )


# ============================================================
# UPDATE RECRUITER PROFILE
# ============================================================

@app.put("/api/recruiter-profile/{user_id}")
def update_recruiter_profile(
    user_id: int,
    request: RecruiterProfileRequest
):

    try:

        with engine.begin() as connection:

            # ------------------------------------------------
            # CHECK USER
            # ------------------------------------------------

            user = get_user_by_id(
                connection,
                user_id
            )

            if not user:

                raise HTTPException(
                    status_code=404,
                    detail="User not found"
                )


            # ------------------------------------------------
            # CHECK USER ROLE
            # ------------------------------------------------

            role = str(
                user.get("role", "")
            ).lower()


            if role != "recruiter":

                raise HTTPException(
                    status_code=403,
                    detail=(
                        "Only recruiter accounts can "
                        "update recruiter profiles."
                    )
                )


            # ------------------------------------------------
            # CHECK TABLE
            # ------------------------------------------------

            if not table_exists(
                connection,
                "recruiter_details"
            ):

                raise HTTPException(
                    status_code=500,
                    detail=(
                        "recruiter_details table does not exist. "
                        "Please create recruiter_details first."
                    )
                )


            # ------------------------------------------------
            # GET TABLE COLUMNS
            # ------------------------------------------------

            columns = get_table_columns(
                connection,
                "recruiter_details"
            )


            # ------------------------------------------------
            # RECRUITER PROFILE FIELDS
            # ------------------------------------------------

            recruiter_fields = [

                "company_name",

                "designation",

                "phone",

                "company_website",

                "company_linkedin",

                "industry",

                "company_size",

                "location",

                "company_description"

            ]


            # ------------------------------------------------
            # COLLECT VALUES
            # ------------------------------------------------

            values = {}


            for field in recruiter_fields:

                if field in columns:

                    value = getattr(
                        request,
                        field,
                        None
                    )

                    if value is not None:

                        values[field] = value


            # ------------------------------------------------
            # CHECK IF PROFILE ALREADY EXISTS
            # ------------------------------------------------

            existing = connection.execute(
                text("""
                    SELECT user_id
                    FROM recruiter_details
                    WHERE user_id = :user_id
                    LIMIT 1
                """),
                {
                    "user_id": user_id
                }
            ).mappings().first()


            # =================================================
            # UPDATE EXISTING PROFILE
            # =================================================

            if existing:

                if values:

                    set_parts = []

                    parameters = {
                        "user_id": user_id
                    }


                    for field, value in values.items():

                        set_parts.append(
                            f"`{field}` = :{field}"
                        )

                        parameters[field] = value


                    query = f"""
                        UPDATE recruiter_details
                        SET {", ".join(set_parts)}
                        WHERE user_id = :user_id
                    """


                    connection.execute(
                        text(query),
                        parameters
                    )


            # =================================================
            # CREATE PROFILE IF IT DOES NOT EXIST
            # =================================================

            else:

                insert_values = {
                    "user_id": user_id
                }


                insert_values.update(
                    values
                )


                field_names = list(
                    insert_values.keys()
                )


                field_sql = ", ".join(
                    f"`{field}`"
                    for field in field_names
                )


                value_sql = ", ".join(
                    f":{field}"
                    for field in field_names
                )


                query = f"""
                    INSERT INTO recruiter_details
                    ({field_sql})
                    VALUES
                    ({value_sql})
                """


                connection.execute(
                    text(query),
                    insert_values
                )


            # ------------------------------------------------
            # RETURN SUCCESS
            # ------------------------------------------------

            return {

                "message":
                    "Recruiter profile updated successfully",

                "user_id":
                    user_id

            }


    except HTTPException:

        raise


    except Exception as e:

        print(
            "RECRUITER PROFILE UPDATE ERROR:",
            str(e)
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Recruiter profile update failed: "
                f"{str(e)}"
            )
        )


# ============================================================
# RUN
# ============================================================

if __name__ == "__main__":

    import uvicorn

    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8000,
        reload=True
    )


# ============================================================
# RECRUITER PROFILE
# ============================================================


# ============================================================
# RECRUITER PROFILE REQUEST MODEL
# ============================================================

class RecruiterProfileRequest(BaseModel):

    company_name: Optional[str] = None

    designation: Optional[str] = None

    phone: Optional[str] = None

    company_website: Optional[str] = None

    company_linkedin: Optional[str] = None

    industry: Optional[str] = None

    company_size: Optional[str] = None

    location: Optional[str] = None

    company_description: Optional[str] = None


# ============================================================
# GET RECRUITER PROFILE
# ============================================================

@app.get("/api/recruiter-profile/{user_id}")
def get_recruiter_profile(
    user_id: int
):

    try:

        with engine.connect() as connection:

            # ------------------------------------------------
            # CHECK USER
            # ------------------------------------------------

            user = get_user_by_id(
                connection,
                user_id
            )

            if not user:

                raise HTTPException(
                    status_code=404,
                    detail="User not found"
                )


            # ------------------------------------------------
            # CHECK USER ROLE
            # ------------------------------------------------

            role = str(
                user.get("role", "")
            ).lower()


            if role != "recruiter":

                raise HTTPException(
                    status_code=403,
                    detail=(
                        "This profile belongs to a recruiter only."
                    )
                )


            # ------------------------------------------------
            # CHECK RECRUITER DETAILS TABLE
            # ------------------------------------------------

            if not table_exists(
                connection,
                "recruiter_details"
            ):

                raise HTTPException(
                    status_code=500,
                    detail=(
                        "recruiter_details table does not exist. "
                        "Please create the recruiter_details table "
                        "in MySQL first."
                    )
                )


            # ------------------------------------------------
            # GET RECRUITER DETAILS
            # ------------------------------------------------

            details = connection.execute(
                text("""
                    SELECT
                        user_id,
                        company_name,
                        designation,
                        phone,
                        company_website,
                        company_linkedin,
                        industry,
                        company_size,
                        location,
                        company_description,
                        created_at,
                        updated_at
                    FROM recruiter_details
                    WHERE user_id = :user_id
                    LIMIT 1
                """),
                {
                    "user_id": user_id
                }
            ).mappings().first()


            # ------------------------------------------------
            # DEFAULT PROFILE
            # ------------------------------------------------

            profile = {

                "user_id": user["user_id"],

                "email": user.get("email"),

                "full_name": user.get("full_name"),

                "role": user.get("role"),

                "company_name": None,

                "designation": None,

                "phone": None,

                "company_website": None,

                "company_linkedin": None,

                "industry": None,

                "company_size": None,

                "location": None,

                "company_description": None,

                "created_at": None,

                "updated_at": None
            }


            # ------------------------------------------------
            # ADD DATABASE DETAILS
            # ------------------------------------------------

            if details:

                for key, value in details.items():

                    if key in profile:

                        profile[key] = value


            # ------------------------------------------------
            # RETURN PROFILE
            # ------------------------------------------------

            return profile


    except HTTPException:

        raise


    except Exception as e:

        print(
            "RECRUITER PROFILE LOAD ERROR:",
            str(e)
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Recruiter profile loading failed: "
                f"{str(e)}"
            )
        )


# ============================================================
# UPDATE RECRUITER PROFILE
# ============================================================

@app.put("/api/recruiter-profile/{user_id}")
def update_recruiter_profile(
    user_id: int,
    request: RecruiterProfileRequest
):

    try:

        with engine.begin() as connection:

            # ------------------------------------------------
            # CHECK USER
            # ------------------------------------------------

            user = get_user_by_id(
                connection,
                user_id
            )

            if not user:

                raise HTTPException(
                    status_code=404,
                    detail="User not found"
                )


            # ------------------------------------------------
            # CHECK USER ROLE
            # ------------------------------------------------

            role = str(
                user.get("role", "")
            ).lower()


            if role != "recruiter":

                raise HTTPException(
                    status_code=403,
                    detail=(
                        "Only recruiter accounts can "
                        "update recruiter profiles."
                    )
                )


            # ------------------------------------------------
            # CHECK TABLE
            # ------------------------------------------------

            if not table_exists(
                connection,
                "recruiter_details"
            ):

                raise HTTPException(
                    status_code=500,
                    detail=(
                        "recruiter_details table does not exist. "
                        "Please create recruiter_details first."
                    )
                )


            # ------------------------------------------------
            # GET TABLE COLUMNS
            # ------------------------------------------------

            columns = get_table_columns(
                connection,
                "recruiter_details"
            )


            # ------------------------------------------------
            # RECRUITER PROFILE FIELDS
            # ------------------------------------------------

            recruiter_fields = [

                "company_name",

                "designation",

                "phone",

                "company_website",

                "company_linkedin",

                "industry",

                "company_size",

                "location",

                "company_description"

            ]


            # ------------------------------------------------
            # COLLECT VALUES
            # ------------------------------------------------

            values = {}


            for field in recruiter_fields:

                if field in columns:

                    value = getattr(
                        request,
                        field,
                        None
                    )

                    if value is not None:

                        values[field] = value


            # ------------------------------------------------
            # CHECK IF PROFILE ALREADY EXISTS
            # ------------------------------------------------

            existing = connection.execute(
                text("""
                    SELECT user_id
                    FROM recruiter_details
                    WHERE user_id = :user_id
                    LIMIT 1
                """),
                {
                    "user_id": user_id
                }
            ).mappings().first()


            # =================================================
            # UPDATE EXISTING PROFILE
            # =================================================

            if existing:

                if values:

                    set_parts = []

                    parameters = {
                        "user_id": user_id
                    }


                    for field, value in values.items():

                        set_parts.append(
                            f"`{field}` = :{field}"
                        )

                        parameters[field] = value


                    query = f"""
                        UPDATE recruiter_details
                        SET {", ".join(set_parts)}
                        WHERE user_id = :user_id
                    """


                    connection.execute(
                        text(query),
                        parameters
                    )


            # =================================================
            # CREATE PROFILE IF IT DOES NOT EXIST
            # =================================================

            else:

                insert_values = {
                    "user_id": user_id
                }


                insert_values.update(
                    values
                )


                field_names = list(
                    insert_values.keys()
                )


                field_sql = ", ".join(
                    f"`{field}`"
                    for field in field_names
                )


                value_sql = ", ".join(
                    f":{field}"
                    for field in field_names
                )


                query = f"""
                    INSERT INTO recruiter_details
                    ({field_sql})
                    VALUES
                    ({value_sql})
                """


                connection.execute(
                    text(query),
                    insert_values
                )


            # ------------------------------------------------
            # RETURN SUCCESS
            # ------------------------------------------------

            return {

                "message":
                    "Recruiter profile updated successfully",

                "user_id":
                    user_id

            }


    except HTTPException:

        raise


    except Exception as e:

        print(
            "RECRUITER PROFILE UPDATE ERROR:",
            str(e)
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Recruiter profile update failed: "
                f"{str(e)}"
            )
        )

# ============================================================
# RECRUITER APPLICATIONS
# ============================================================

# ============================================================
# APPLICATION STATUS REQUEST
# ============================================================

class ApplicationStatusRequest(BaseModel):
    status: str


# ============================================================
# GET ALL APPLICATIONS FOR RECRUITER
# ============================================================

@app.get("/api/recruiter/applications/{recruiter_id}")
def get_recruiter_applications(recruiter_id: int):

    try:

        with engine.connect() as connection:

            query = text("""
                SELECT
                    ra.application_id,
                    ra.student_id,

                    u.full_name AS student_name,
                    u.email AS email,

                    ra.job_id,

                    j.job_title AS job_title,
                    j.company_name AS company_name,

                    COALESCE(
                        ra.match_percentage,
                        0
                    ) AS match_percentage,

                    NULL AS assessment_score,

                    ra.applied_at,

                    COALESCE(
                        ra.application_status,
                        'Applied'
                    ) AS status,

                    NULL AS recruiter_notes

                FROM applications ra

                INNER JOIN jobs j
                    ON ra.job_id = j.job_id

                INNER JOIN users u
                    ON ra.student_id = u.user_id

                WHERE j.recruiter_id = :recruiter_id

                ORDER BY ra.applied_at DESC
            """)

            result = connection.execute(
                query,
                {
                    "recruiter_id": recruiter_id
                }
            )

            applications = []

            for row in result.mappings():

                applications.append(dict(row))

            return applications

    except Exception as e:

        print(
            "ERROR - Get recruiter applications:",
            str(e)
        )

        raise HTTPException(
            status_code=500,
            detail=f"Unable to load applications: {str(e)}"
        )


# ============================================================
# GET SINGLE RECRUITER APPLICATION
# ============================================================

@app.get(
    "/api/recruiter/application/{application_id}"
)
def get_single_recruiter_application(
    application_id: int
):

    try:

        with engine.connect() as connection:

            query = text("""
                SELECT
                    ra.application_id,
                    ra.student_id,

                    u.full_name AS student_name,
                    u.email AS email,

                    ra.job_id,

                    j.job_title AS job_title,
                    j.company_name AS company_name,

                    j.location AS location,
                    j.job_type AS job_type,
                    j.work_mode AS work_mode,

                    COALESCE(
                        ra.match_percentage,
                        0
                    ) AS match_percentage,

                    NULL AS assessment_score,

                    ra.applied_at,

                    COALESCE(
                        ra.application_status,
                        'Applied'
                    ) AS status,

                    NULL AS recruiter_notes,

                    j.recruiter_id

                FROM applications ra

                INNER JOIN jobs j
                    ON ra.job_id = j.job_id

                INNER JOIN users u
                    ON ra.student_id = u.user_id

                WHERE ra.application_id = :application_id
            """)

            result = connection.execute(
                query,
                {
                    "application_id": application_id
                }
            )

            application = result.mappings().fetchone()

            if not application:

                raise HTTPException(
                    status_code=404,
                    detail="Application not found."
                )

            return dict(application)

    except HTTPException:
        raise

    except Exception as e:

        print(
            "ERROR - Get single recruiter application:",
            str(e)
        )

        raise HTTPException(
            status_code=500,
            detail=f"Unable to load application: {str(e)}"
        )


# ============================================================
# UPDATE APPLICATION STATUS
# ============================================================

@app.put(
    "/api/recruiter/applications/{application_id}/status"
)
def update_recruiter_application_status(
    application_id: int,
    request: ApplicationStatusRequest
):

    allowed_statuses = [
        "Applied",
        "Shortlisted",
        "Rejected",
        "Interview"
    ]

    new_status = request.status.strip()

    if new_status not in allowed_statuses:

        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid status. Allowed statuses are: "
                "Applied, Shortlisted, Rejected, Interview."
            )
        )

    try:

        with engine.begin() as connection:

            # ------------------------------------------------
            # CHECK APPLICATION
            # ------------------------------------------------

            check_query = text("""
                SELECT application_id
                FROM applications
                WHERE application_id = :application_id
            """)

            application = connection.execute(
                check_query,
                {
                    "application_id": application_id
                }
            ).fetchone()

            if not application:

                raise HTTPException(
                    status_code=404,
                    detail="Application not found."
                )

            # ------------------------------------------------
            # UPDATE STATUS
            # ------------------------------------------------

            update_query = text("""
                UPDATE applications

                SET application_status = :status

                WHERE application_id = :application_id
            """)

            connection.execute(
                update_query,
                {
                    "status": new_status,
                    "application_id": application_id
                }
            )

        return {
            "success": True,
            "message": "Application status updated successfully.",
            "application_id": application_id,
            "status": new_status
        }

    except HTTPException:
        raise

    except Exception as e:

        print(
            "ERROR - Update recruiter application status:",
            str(e)
        )

        raise HTTPException(
            status_code=500,
            detail=f"Unable to update application status: {str(e)}"
        )


# ============================================================
# SHORTLIST APPLICATION
# ============================================================

@app.put(
    "/api/recruiter/applications/{application_id}/shortlist"
)
def shortlist_recruiter_application(
    application_id: int
):

    try:

        with engine.begin() as connection:

            check_query = text("""
                SELECT application_id
                FROM applications
                WHERE application_id = :application_id
            """)

            application = connection.execute(
                check_query,
                {
                    "application_id": application_id
                }
            ).fetchone()

            if not application:

                raise HTTPException(
                    status_code=404,
                    detail="Application not found."
                )

            update_query = text("""
                UPDATE applications

                SET application_status = 'Shortlisted'

                WHERE application_id = :application_id
            """)

            connection.execute(
                update_query,
                {
                    "application_id": application_id
                }
            )

        return {
            "success": True,
            "message": "Student shortlisted successfully.",
            "application_id": application_id,
            "status": "Shortlisted"
        }

    except HTTPException:
        raise

    except Exception as e:

        print(
            "ERROR - Shortlist application:",
            str(e)
        )

        raise HTTPException(
            status_code=500,
            detail=f"Unable to shortlist application: {str(e)}"
        )


# ============================================================
# MOVE APPLICATION TO INTERVIEW
# ============================================================

@app.put(
    "/api/recruiter/applications/{application_id}/interview"
)
def move_recruiter_application_to_interview(
    application_id: int
):

    try:

        with engine.begin() as connection:

            check_query = text("""
                SELECT application_id
                FROM applications
                WHERE application_id = :application_id
            """)

            application = connection.execute(
                check_query,
                {
                    "application_id": application_id
                }
            ).fetchone()

            if not application:

                raise HTTPException(
                    status_code=404,
                    detail="Application not found."
                )

            update_query = text("""
                UPDATE applications

                SET application_status = 'Interview'

                WHERE application_id = :application_id
            """)

            connection.execute(
                update_query,
                {
                    "application_id": application_id
                }
            )

        return {
            "success": True,
            "message": "Application moved to interview.",
            "application_id": application_id,
            "status": "Interview"
        }

    except HTTPException:
        raise

    except Exception as e:

        print(
            "ERROR - Move application to interview:",
            str(e)
        )

        raise HTTPException(
            status_code=500,
            detail=f"Unable to move application to interview: {str(e)}"
        )


# ============================================================
# REJECT APPLICATION
# ============================================================

@app.put(
    "/api/recruiter/applications/{application_id}/reject"
)
def reject_recruiter_application(
    application_id: int
):

    try:

        with engine.begin() as connection:

            check_query = text("""
                SELECT application_id
                FROM applications
                WHERE application_id = :application_id
            """)

            application = connection.execute(
                check_query,
                {
                    "application_id": application_id
                }
            ).fetchone()

            if not application:

                raise HTTPException(
                    status_code=404,
                    detail="Application not found."
                )

            update_query = text("""
                UPDATE applications

                SET application_status = 'Rejected'

                WHERE application_id = :application_id
            """)

            connection.execute(
                update_query,
                {
                    "application_id": application_id
                }
            )

        return {
            "success": True,
            "message": "Application rejected successfully.",
            "application_id": application_id,
            "status": "Rejected"
        }

    except HTTPException:
        raise

    except Exception as e:

        print(
            "ERROR - Reject application:",
            str(e)
        )

        raise HTTPException(
            status_code=500,
            detail=f"Unable to reject application: {str(e)}"
        )


# ============================================================
# GET SHORTLISTED APPLICATIONS
# ============================================================

@app.get(
    "/api/recruiter/shortlisted/{recruiter_id}"
)
def get_recruiter_shortlisted_applications(
    recruiter_id: int
):

    try:

        with engine.connect() as connection:

            query = text("""
                SELECT
                    ra.application_id,
                    ra.student_id,

                    u.full_name AS student_name,
                    u.email AS student_email,
                    u.email AS email,

                    ra.job_id,

                    j.recruiter_id,
                    j.job_title AS job_title,
                    j.company_name AS company_name,
                    j.location AS location,
                    j.job_type AS job_type,
                    j.work_mode AS work_mode,

                    COALESCE(
                        ra.match_percentage,
                        0
                    ) AS match_percentage,

                    NULL AS assessment_score,
                    ra.applied_at,

                    COALESCE(
                        ra.application_status,
                        'Applied'
                    ) AS status,

                    NULL AS recruiter_notes

                FROM applications ra

                INNER JOIN jobs j
                    ON ra.job_id = j.job_id

                INNER JOIN users u
                    ON ra.student_id = u.user_id

                WHERE
                    j.recruiter_id = :recruiter_id
                    AND ra.application_status = 'Shortlisted'

                ORDER BY ra.applied_at DESC
            """)

            result = connection.execute(
                query,
                {
                    "recruiter_id": recruiter_id
                }
            )

            applications = []

            for row in result.mappings():

                application = dict(row)

                if application.get("applied_at") is not None:
                    application["applied_at"] = application[
                        "applied_at"
                    ].isoformat()

                if application.get("match_percentage") is not None:
                    application["match_percentage"] = float(
                        application["match_percentage"]
                    )

                if application.get("assessment_score") is not None:
                    application["assessment_score"] = float(
                        application["assessment_score"]
                    )

                applications.append(application)

            return applications

    except Exception as e:

        print(
            "ERROR - Get shortlisted applications:",
            str(e)
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Unable to load shortlisted applications: "
                f"{str(e)}"
            )
        )


# ============================================================
# INTERVIEW MODELS
# ============================================================

class ScheduleInterviewRequest(BaseModel):
    application_id: int
    recruiter_id: int
    interview_date: str
    interview_time: str
    mode: str = "Online"
    meeting_link: Optional[str] = None


class InterviewStatusRequest(BaseModel):
    status: str


class InterviewEvaluationRequest(BaseModel):
    technical_skills: float = 0
    communication: float = 0
    problem_solving: float = 0
    confidence: float = 0
    role_knowledge: float = 0
    overall_score: Optional[float] = None
    recruiter_feedback: Optional[str] = None
    final_decision: Optional[str] = None


# ============================================================
# GET RECRUITER INTERVIEWS
# ============================================================

@app.get("/api/recruiter/interviews/{recruiter_id}")
def get_recruiter_interviews(recruiter_id: int):
    try:
        with engine.connect() as connection:
            recruiter = connection.execute(
                text("""
                    SELECT user_id, role
                    FROM users
                    WHERE user_id = :user_id
                    LIMIT 1
                """),
                {"user_id": recruiter_id}
            ).mappings().first()

            if not recruiter:
                raise HTTPException(status_code=404, detail="Recruiter not found.")

            if str(recruiter["role"]).strip().lower() != "recruiter":
                raise HTTPException(status_code=403, detail="Only recruiters can access interviews.")

            rows = connection.execute(
                text("""
                    SELECT
                        i.interview_id,
                        i.application_id,
                        ra.student_id,
                        ra.job_id,
                        j.recruiter_id,
                        u.full_name AS student_name,
                        u.email AS student_email,
                        u.email AS email,
                        j.job_title AS job_title,
                        j.company_name AS company_name,
                        j.location AS job_location,
                        i.interview_date,
                        i.interview_time,
                        i.mode,
                        i.mode AS interview_type,
                        i.meeting_link,
                        CASE WHEN i.mode = 'Offline' THEN i.meeting_link ELSE NULL END
                            AS interview_location,
                        NULL AS interview_round,
                        NULL AS recruiter_notes,
                        i.status,
                        i.created_at,
                        COALESCE(ra.match_percentage, 0) AS match_percentage,
                        NULL AS assessment_score,
                        ie.evaluation_id,
                        ie.technical_skills,
                        ie.communication,
                        ie.problem_solving,
                        ie.confidence,
                        ie.role_knowledge,
                        ie.overall_score,
                        ie.recruiter_feedback,
                        ie.final_decision,
                        ie.evaluated_at
                    FROM interviews i
                    INNER JOIN applications ra
                        ON i.application_id = ra.application_id
                    INNER JOIN jobs j
                        ON ra.job_id = j.job_id
                    INNER JOIN users u
                        ON ra.student_id = u.user_id
                    LEFT JOIN interview_evaluations ie
                        ON i.interview_id = ie.interview_id
                    WHERE j.recruiter_id = :recruiter_id
                    ORDER BY
                        CASE
                            WHEN i.status = 'Scheduled' THEN 0
                            WHEN i.status = 'Completed' THEN 1
                            ELSE 2
                        END,
                        i.interview_date ASC,
                        i.interview_time ASC
                """),
                {"recruiter_id": recruiter_id}
            ).mappings().all()

            interviews = []
            for row in rows:
                item = dict(row)
                for field in ("interview_date", "interview_time", "created_at", "evaluated_at"):
                    if item.get(field) is not None:
                        item[field] = str(item[field])

                for field in (
                    "match_percentage", "assessment_score", "technical_skills",
                    "communication", "problem_solving", "confidence",
                    "role_knowledge", "overall_score"
                ):
                    if item.get(field) is not None:
                        item[field] = float(item[field])

                interviews.append(item)

            return interviews

    except HTTPException:
        raise
    except Exception as e:
        print("ERROR - Get recruiter interviews:", str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Unable to load interviews: {str(e)}"
        )


# ============================================================
# SCHEDULE INTERVIEW
# ============================================================

@app.post("/api/recruiter/interviews")
def schedule_recruiter_interview(request: ScheduleInterviewRequest):
    if request.mode not in {"Online", "Offline"}:
        raise HTTPException(status_code=400, detail="Mode must be Online or Offline.")

    if not request.meeting_link or not request.meeting_link.strip():
        detail = (
            "Meeting link is required for an online interview."
            if request.mode == "Online"
            else "Interview location is required for an offline interview."
        )
        raise HTTPException(status_code=400, detail=detail)

    try:
        datetime.strptime(request.interview_date, "%Y-%m-%d")
        datetime.strptime(request.interview_time, "%H:%M")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid interview date or time format.")

    try:
        with engine.begin() as connection:
            recruiter = connection.execute(
                text("""
                    SELECT user_id, role
                    FROM users
                    WHERE user_id = :recruiter_id
                    LIMIT 1
                """),
                {"recruiter_id": request.recruiter_id}
            ).mappings().first()

            if not recruiter:
                raise HTTPException(status_code=404, detail="Recruiter not found.")

            if str(recruiter["role"]).strip().lower() != "recruiter":
                raise HTTPException(status_code=403, detail="Only recruiters can schedule interviews.")

            application = connection.execute(
                text("""
                    SELECT
                        ra.application_id,
                        ra.student_id,
                        ra.job_id,
                        ra.application_status AS status,
                        j.recruiter_id
                    FROM applications ra
                    INNER JOIN jobs j ON ra.job_id = j.job_id
                    WHERE ra.application_id = :application_id
                    LIMIT 1
                """),
                {"application_id": request.application_id}
            ).mappings().first()

            if not application:
                raise HTTPException(status_code=404, detail="Application not found.")

            if int(application["recruiter_id"]) != int(request.recruiter_id):
                raise HTTPException(
                    status_code=403,
                    detail="You are not authorized to schedule an interview for this application."
                )

            if application["status"] not in ("Shortlisted", "Interview"):
                raise HTTPException(
                    status_code=400,
                    detail="Only shortlisted students can be scheduled for an interview."
                )

            existing = connection.execute(
                text("""
                    SELECT interview_id
                    FROM interviews
                    WHERE application_id = :application_id
                      AND status = 'Scheduled'
                    LIMIT 1
                """),
                {"application_id": request.application_id}
            ).mappings().first()

            if existing:
                raise HTTPException(
                    status_code=409,
                    detail="A scheduled interview already exists for this application."
                )

            result = connection.execute(
                text("""
                    INSERT INTO interviews (
                        application_id,
                        interview_date,
                        interview_time,
                        mode,
                        meeting_link,
                        status
                    )
                    VALUES (
                        :application_id,
                        :interview_date,
                        :interview_time,
                        :mode,
                        :meeting_link,
                        'Scheduled'
                    )
                """),
                {
                    "application_id": request.application_id,
                    "interview_date": request.interview_date,
                    "interview_time": request.interview_time,
                    "mode": request.mode,
                    # The current schema has only meeting_link; for Offline
                    # interviews this field stores the physical location.
                    "meeting_link": request.meeting_link.strip()
                }
            )

            connection.execute(
                text("""
                    UPDATE applications
                    SET application_status = 'Interview'
                    WHERE application_id = :application_id
                """),
                {"application_id": request.application_id}
            )

            return {
                "success": True,
                "message": "Interview scheduled successfully.",
                "interview_id": result.lastrowid,
                "application_id": request.application_id,
                "student_id": application["student_id"],
                "job_id": application["job_id"],
                "status": "Scheduled"
            }

    except HTTPException:
        raise
    except Exception as e:
        print("ERROR - Schedule interview:", str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Unable to schedule interview: {str(e)}"
        )


# ============================================================
# UPDATE INTERVIEW STATUS
# ============================================================

@app.put("/api/recruiter/interviews/{interview_id}/status")
def update_recruiter_interview_status(
    interview_id: int,
    request: InterviewStatusRequest
):
    allowed_statuses = {"Scheduled", "Completed", "Cancelled"}
    if request.status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail="Invalid interview status. Choose Scheduled, Completed or Cancelled."
        )

    try:
        with engine.begin() as connection:
            interview = connection.execute(
                text("""
                    SELECT interview_id, application_id
                    FROM interviews
                    WHERE interview_id = :interview_id
                    LIMIT 1
                """),
                {"interview_id": interview_id}
            ).mappings().first()

            if not interview:
                raise HTTPException(status_code=404, detail="Interview not found.")

            connection.execute(
                text("""
                    UPDATE interviews
                    SET status = :status
                    WHERE interview_id = :interview_id
                """),
                {"status": request.status, "interview_id": interview_id}
            )

            if request.status == "Cancelled":
                connection.execute(
                    text("""
                        UPDATE applications
                        SET application_status = 'Shortlisted'
                        WHERE application_id = :application_id
                          AND application_status = 'Interview'
                    """),
                    {"application_id": interview["application_id"]}
                )
            elif request.status in ("Scheduled", "Completed"):
                connection.execute(
                    text("""
                        UPDATE applications
                        SET application_status = 'Interview'
                        WHERE application_id = :application_id
                    """),
                    {"application_id": interview["application_id"]}
                )

            return {
                "success": True,
                "message": f"Interview marked as {request.status}.",
                "interview_id": interview_id,
                "status": request.status
            }

    except HTTPException:
        raise
    except Exception as e:
        print("ERROR - Update interview status:", str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Unable to update interview status: {str(e)}"
        )


# ============================================================
# SAVE INTERVIEW EVALUATION
# ============================================================

@app.post("/api/recruiter/interviews/{interview_id}/evaluation")
def save_interview_evaluation(
    interview_id: int,
    request: InterviewEvaluationRequest
):
    scores = [
        request.technical_skills,
        request.communication,
        request.problem_solving,
        request.confidence,
        request.role_knowledge
    ]

    if any(float(score) < 0 or float(score) > 10 for score in scores):
        raise HTTPException(
            status_code=400,
            detail="All evaluation scores must be between 0 and 10."
        )

    if request.final_decision not in (None, "", "Selected", "Rejected", "On Hold"):
        raise HTTPException(status_code=400, detail="Invalid final decision.")

    # Scores are collected out of 10 and stored as a percentage out of 100.
    overall_score = round(sum(float(score) for score in scores) / 5 * 10, 2)

    try:
        with engine.begin() as connection:
            interview = connection.execute(
                text("""
                    SELECT interview_id, application_id
                    FROM interviews
                    WHERE interview_id = :interview_id
                    LIMIT 1
                """),
                {"interview_id": interview_id}
            ).mappings().first()

            if not interview:
                raise HTTPException(status_code=404, detail="Interview not found.")

            existing = connection.execute(
                text("""
                    SELECT evaluation_id
                    FROM interview_evaluations
                    WHERE interview_id = :interview_id
                    LIMIT 1
                """),
                {"interview_id": interview_id}
            ).mappings().first()

            values = {
                "interview_id": interview_id,
                "technical_skills": request.technical_skills,
                "communication": request.communication,
                "problem_solving": request.problem_solving,
                "confidence": request.confidence,
                "role_knowledge": request.role_knowledge,
                "overall_score": overall_score,
                "recruiter_feedback": request.recruiter_feedback,
                "final_decision": request.final_decision or None
            }

            if existing:
                connection.execute(
                    text("""
                        UPDATE interview_evaluations
                        SET
                            technical_skills = :technical_skills,
                            communication = :communication,
                            problem_solving = :problem_solving,
                            confidence = :confidence,
                            role_knowledge = :role_knowledge,
                            overall_score = :overall_score,
                            recruiter_feedback = :recruiter_feedback,
                            final_decision = :final_decision
                        WHERE evaluation_id = :evaluation_id
                    """),
                    {**values, "evaluation_id": existing["evaluation_id"]}
                )
                evaluation_id = existing["evaluation_id"]
            else:
                result = connection.execute(
                    text("""
                        INSERT INTO interview_evaluations (
                            interview_id,
                            technical_skills,
                            communication,
                            problem_solving,
                            confidence,
                            role_knowledge,
                            overall_score,
                            recruiter_feedback,
                            final_decision
                        )
                        VALUES (
                            :interview_id,
                            :technical_skills,
                            :communication,
                            :problem_solving,
                            :confidence,
                            :role_knowledge,
                            :overall_score,
                            :recruiter_feedback,
                            :final_decision
                        )
                    """),
                    values
                )
                evaluation_id = result.lastrowid

            connection.execute(
                text("""
                    UPDATE interviews
                    SET status = 'Completed'
                    WHERE interview_id = :interview_id
                """),
                {"interview_id": interview_id}
            )

            connection.execute(
                text("""
                    UPDATE applications
                    SET application_status = 'Interview'
                    WHERE application_id = :application_id
                """),
                {"application_id": interview["application_id"]}
            )

            return {
                "success": True,
                "message": "Interview evaluation saved successfully.",
                "interview_id": interview_id,
                "evaluation_id": evaluation_id,
                "overall_score": overall_score,
                "final_decision": request.final_decision or None,
                "status": "Completed"
            }

    except HTTPException:
        raise
    except Exception as e:
        print("ERROR - Save interview evaluation:", str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Unable to save interview evaluation: {str(e)}"
        )

# ============================================================
# RECRUITER SETTINGS
# GET /api/recruiter/settings/{recruiter_id}
# PUT /api/recruiter/settings/{recruiter_id}
# ============================================================

class RecruiterSettingsRequest(BaseModel):
    email_notifications: bool = True
    new_application_notifications: bool = True
    shortlisted_notifications: bool = True
    interview_reminders: bool = True
    evaluation_reminders: bool = True

    preferred_branches: Optional[str] = None
    minimum_cgpa: Optional[float] = 6.00
    preferred_skills: Optional[str] = None

    default_job_type: Optional[str] = "Full-time"
    default_work_mode: Optional[str] = "On-site"
    default_interview_mode: Optional[str] = "Online"
    default_interview_duration: Optional[int] = 30
    preferred_meeting_platform: Optional[str] = None


RECRUITER_SETTINGS_DEFAULTS = {
    "email_notifications": True,
    "new_application_notifications": True,
    "shortlisted_notifications": True,
    "interview_reminders": True,
    "evaluation_reminders": True,
    "preferred_branches": None,
    "minimum_cgpa": 6.00,
    "preferred_skills": None,
    "default_job_type": "Full-time",
    "default_work_mode": "On-site",
    "default_interview_mode": "Online",
    "default_interview_duration": 30,
    "preferred_meeting_platform": None,
}


def validate_recruiter_settings_owner(connection, recruiter_id: int):
    """Ensure the requested account exists and belongs to a recruiter."""
    recruiter = connection.execute(
        text("""
            SELECT user_id, role
            FROM users
            WHERE user_id = :recruiter_id
            LIMIT 1
        """),
        {"recruiter_id": recruiter_id}
    ).mappings().first()

    if not recruiter:
        raise HTTPException(status_code=404, detail="Recruiter account not found.")

    if str(recruiter.get("role", "")).strip().lower() != "recruiter":
        raise HTTPException(
            status_code=403,
            detail="Recruiter settings are available only for recruiter accounts."
        )

    if not table_exists(connection, "recruiter_settings"):
        raise HTTPException(
            status_code=500,
            detail="recruiter_settings table does not exist. Create the table in MySQL first."
        )


def serialize_recruiter_settings(row, recruiter_id: int):
    """Return settings in a JSON-friendly format with sensible defaults."""
    result = {
        "recruiter_id": recruiter_id,
        **RECRUITER_SETTINGS_DEFAULTS,
    }

    if row:
        for key in RECRUITER_SETTINGS_DEFAULTS:
            if key in row and row[key] is not None:
                result[key] = row[key]

        if row.get("settings_id") is not None:
            result["settings_id"] = row["settings_id"]

        if row.get("created_at") is not None:
            result["created_at"] = row["created_at"].isoformat()

        if row.get("updated_at") is not None:
            result["updated_at"] = row["updated_at"].isoformat()

    for key in (
        "email_notifications",
        "new_application_notifications",
        "shortlisted_notifications",
        "interview_reminders",
        "evaluation_reminders",
    ):
        result[key] = bool(result[key])

    return result


@app.get("/api/recruiter/settings/{recruiter_id}")
def get_recruiter_settings(recruiter_id: int):
    """Load recruiter settings; create a default row for first-time users."""
    try:
        with engine.begin() as connection:
            validate_recruiter_settings_owner(connection, recruiter_id)

            row = connection.execute(
                text("""
                    SELECT *
                    FROM recruiter_settings
                    WHERE recruiter_id = :recruiter_id
                    LIMIT 1
                """),
                {"recruiter_id": recruiter_id}
            ).mappings().first()

            if not row:
                connection.execute(
                    text("""
                        INSERT INTO recruiter_settings (
                            recruiter_id,
                            email_notifications,
                            new_application_notifications,
                            shortlisted_notifications,
                            interview_reminders,
                            evaluation_reminders,
                            preferred_branches,
                            minimum_cgpa,
                            preferred_skills,
                            default_job_type,
                            default_work_mode,
                            default_interview_mode,
                            default_interview_duration,
                            preferred_meeting_platform
                        )
                        VALUES (
                            :recruiter_id,
                            :email_notifications,
                            :new_application_notifications,
                            :shortlisted_notifications,
                            :interview_reminders,
                            :evaluation_reminders,
                            :preferred_branches,
                            :minimum_cgpa,
                            :preferred_skills,
                            :default_job_type,
                            :default_work_mode,
                            :default_interview_mode,
                            :default_interview_duration,
                            :preferred_meeting_platform
                        )
                    """),
                    {
                        "recruiter_id": recruiter_id,
                        **RECRUITER_SETTINGS_DEFAULTS,
                    }
                )

                row = connection.execute(
                    text("""
                        SELECT *
                        FROM recruiter_settings
                        WHERE recruiter_id = :recruiter_id
                        LIMIT 1
                    """),
                    {"recruiter_id": recruiter_id}
                ).mappings().first()

            return serialize_recruiter_settings(row, recruiter_id)

    except HTTPException:
        raise
    except Exception as e:
        print("GET RECRUITER SETTINGS ERROR:", str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Failed to load recruiter settings: {str(e)}"
        )


@app.put("/api/recruiter/settings/{recruiter_id}")
def update_recruiter_settings(
    recruiter_id: int,
    request: RecruiterSettingsRequest
):
    """Save recruiter notification, hiring, and interview preferences."""
    try:
        allowed_work_modes = {"On-site", "Hybrid", "Remote"}
        allowed_interview_modes = {"Online", "Offline"}

        if request.default_work_mode not in allowed_work_modes:
            raise HTTPException(
                status_code=400,
                detail="default_work_mode must be On-site, Hybrid, or Remote."
            )

        if request.default_interview_mode not in allowed_interview_modes:
            raise HTTPException(
                status_code=400,
                detail="default_interview_mode must be Online or Offline."
            )

        if request.minimum_cgpa is not None and not 0 <= request.minimum_cgpa <= 10:
            raise HTTPException(
                status_code=400,
                detail="minimum_cgpa must be between 0 and 10."
            )

        if (
            request.default_interview_duration is not None
            and request.default_interview_duration <= 0
        ):
            raise HTTPException(
                status_code=400,
                detail="default_interview_duration must be greater than 0."
            )

        values = {
            "recruiter_id": recruiter_id,
            "email_notifications": request.email_notifications,
            "new_application_notifications": request.new_application_notifications,
            "shortlisted_notifications": request.shortlisted_notifications,
            "interview_reminders": request.interview_reminders,
            "evaluation_reminders": request.evaluation_reminders,
            "preferred_branches": (
                request.preferred_branches.strip()
                if request.preferred_branches and request.preferred_branches.strip()
                else None
            ),
            "minimum_cgpa": request.minimum_cgpa,
            "preferred_skills": (
                request.preferred_skills.strip()
                if request.preferred_skills and request.preferred_skills.strip()
                else None
            ),
            "default_job_type": (
                request.default_job_type.strip()
                if request.default_job_type and request.default_job_type.strip()
                else "Full-time"
            ),
            "default_work_mode": request.default_work_mode or "On-site",
            "default_interview_mode": request.default_interview_mode or "Online",
            "default_interview_duration": request.default_interview_duration or 30,
            "preferred_meeting_platform": (
                request.preferred_meeting_platform.strip()
                if request.preferred_meeting_platform
                and request.preferred_meeting_platform.strip()
                else None
            ),
        }

        with engine.begin() as connection:
            validate_recruiter_settings_owner(connection, recruiter_id)

            existing = connection.execute(
                text("""
                    SELECT settings_id
                    FROM recruiter_settings
                    WHERE recruiter_id = :recruiter_id
                    LIMIT 1
                """),
                {"recruiter_id": recruiter_id}
            ).mappings().first()

            if existing:
                connection.execute(
                    text("""
                        UPDATE recruiter_settings
                        SET
                            email_notifications = :email_notifications,
                            new_application_notifications = :new_application_notifications,
                            shortlisted_notifications = :shortlisted_notifications,
                            interview_reminders = :interview_reminders,
                            evaluation_reminders = :evaluation_reminders,
                            preferred_branches = :preferred_branches,
                            minimum_cgpa = :minimum_cgpa,
                            preferred_skills = :preferred_skills,
                            default_job_type = :default_job_type,
                            default_work_mode = :default_work_mode,
                            default_interview_mode = :default_interview_mode,
                            default_interview_duration = :default_interview_duration,
                            preferred_meeting_platform = :preferred_meeting_platform
                        WHERE recruiter_id = :recruiter_id
                    """),
                    values
                )
            else:
                connection.execute(
                    text("""
                        INSERT INTO recruiter_settings (
                            recruiter_id,
                            email_notifications,
                            new_application_notifications,
                            shortlisted_notifications,
                            interview_reminders,
                            evaluation_reminders,
                            preferred_branches,
                            minimum_cgpa,
                            preferred_skills,
                            default_job_type,
                            default_work_mode,
                            default_interview_mode,
                            default_interview_duration,
                            preferred_meeting_platform
                        )
                        VALUES (
                            :recruiter_id,
                            :email_notifications,
                            :new_application_notifications,
                            :shortlisted_notifications,
                            :interview_reminders,
                            :evaluation_reminders,
                            :preferred_branches,
                            :minimum_cgpa,
                            :preferred_skills,
                            :default_job_type,
                            :default_work_mode,
                            :default_interview_mode,
                            :default_interview_duration,
                            :preferred_meeting_platform
                        )
                    """),
                    values
                )

            saved_row = connection.execute(
                text("""
                    SELECT *
                    FROM recruiter_settings
                    WHERE recruiter_id = :recruiter_id
                    LIMIT 1
                """),
                {"recruiter_id": recruiter_id}
            ).mappings().first()

            return {
                "success": True,
                "message": "Recruiter settings saved successfully.",
                "settings": serialize_recruiter_settings(saved_row, recruiter_id),
            }

    except HTTPException:
        raise
    except Exception as e:
        print("UPDATE RECRUITER SETTINGS ERROR:", str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save recruiter settings: {str(e)}"
        )


# ============================================================
# ASSESSMENT SUBMISSION + SAVING ANSWERS
# Added without removing existing ElectroHire routes.
# ============================================================



# ============================================================
# ASSESSMENT QUESTIONS: SERVE REAL MYSQL QUESTION IDS
# ============================================================
def _assessment_question_payload(row, columns):
    """Map varying assessment_questions schemas to the frontend format."""
    data = dict(row)
    text_keys = ("question_text", "question", "question_title", "question_statement", "title", "text")
    question_text = next((data.get(k) for k in text_keys if data.get(k) is not None), None)
    if question_text is None:
        raise HTTPException(status_code=500, detail=(
            "Could not identify the question text column in assessment_questions. "
            f"Available columns: {', '.join(columns)}"
        ))

    options = []
    # Support schemas with option_a/option_b/... or option1/option2/... columns.
    for letter, number in zip(("a", "b", "c", "d"), range(1, 5)):
        value = None
        for key in (f"option_{letter}", f"option{letter}", f"option_{number}", f"option{number}", f"choice_{letter}", f"choice{number}"):
            if data.get(key) is not None and str(data.get(key)).strip():
                value = data.get(key)
                break
        if value is not None:
            options.append(str(value))

    if not options:
        for key in ("options", "choices", "options_json"):
            raw = data.get(key)
            if raw is None:
                continue
            if isinstance(raw, str):
                try:
                    import json
                    raw = json.loads(raw)
                except Exception:
                    raw = [part.strip() for part in raw.split("|") if part.strip()]
            if isinstance(raw, dict):
                raw = list(raw.values())
            if isinstance(raw, (list, tuple)):
                options = [str(value) for value in raw if value is not None and str(value).strip()]
                if options:
                    break

    if len(options) < 2:
        raise HTTPException(status_code=500, detail=(
            "Could not identify at least two answer options in assessment_questions. "
            f"Expected option_a/option_b/option_c/option_d or an options JSON column. "
            f"Available columns: {', '.join(columns)}"
        ))

    skill = next((data.get(k) for k in ("skill_name", "skill", "category", "topic") if data.get(k)), "General Assessment")
    return {"id": int(data["question_id"]), "question_id": int(data["question_id"]),
            "question": str(question_text), "question_text": str(question_text),
            "options": options[:4], "skill": str(skill)}


@app.get("/api/assessment/questions")
def get_assessment_questions(limit: int = 15):
    """Return assessment questions from MySQL without exposing correct answers."""
    try:
        with engine.connect() as connection:
            if not table_exists(connection, "assessment_questions"):
                raise HTTPException(status_code=500, detail="Required table 'assessment_questions' does not exist.")
            columns = get_table_columns(connection, "assessment_questions")
            if "question_id" not in columns:
                raise HTTPException(status_code=500, detail="assessment_questions must contain a question_id column.")
            safe_limit = max(1, min(int(limit), 50))
            rows = connection.execute(text(
                f"SELECT * FROM assessment_questions ORDER BY RAND() LIMIT {safe_limit}"
            )).mappings().all()
            if not rows:
                raise HTTPException(status_code=404, detail="No questions were found in assessment_questions.")
            questions = [_assessment_question_payload(row, columns) for row in rows]
            return {"questions": questions, "count": len(questions)}
    except HTTPException:
        raise
    except Exception as e:
        print("GET ASSESSMENT QUESTIONS ERROR:", str(e))
        raise HTTPException(status_code=500, detail=f"Failed to load assessment questions: {str(e)}")


class AssessmentSubmissionRequest(BaseModel):
    user_id: int
    assessment_id: Optional[int] = None
    answers: dict = {}
    questions: list = []
    skill_name: Optional[str] = "General Assessment"
    feedback: Optional[str] = None
    time_taken: Optional[int] = 0


@app.post("/api/assessments/submit")
def submit_assessment(request: AssessmentSubmissionRequest):
    """Persist an assessment attempt, answer rows, summary, and skill analysis.

    Question IDs received from the frontend MUST exist in assessment_questions.
    Correct answers are read from MySQL, not trusted from the browser.
    """
    try:
        with engine.begin() as connection:
            student_id = find_student_id(connection, request.user_id)

            for table in ("assessments", "assessment_questions", "assessment_answers"):
                if not table_exists(connection, table):
                    raise HTTPException(status_code=500, detail=f"Required table '{table}' does not exist.")

            assessment_cols = get_table_columns(connection, "assessments")
            answer_cols = get_table_columns(connection, "assessment_answers")
            assessment_id = request.assessment_id

            if assessment_id is not None:
                attempt = connection.execute(text("""
                    SELECT assessment_id, student_id FROM assessments
                    WHERE assessment_id = :aid LIMIT 1
                """), {"aid": assessment_id}).mappings().first()
                if not attempt:
                    raise HTTPException(status_code=404, detail="Assessment attempt not found.")
                if int(attempt["student_id"]) != int(student_id):
                    raise HTTPException(status_code=403, detail="Assessment does not belong to this student.")
            else:
                insert = {"student_id": student_id}
                if "difficulty" in assessment_cols:
                    insert["difficulty"] = "Intermediate"
                if "start_time" in assessment_cols:
                    insert["start_time"] = datetime.now()
                if "status" in assessment_cols:
                    insert["status"] = "In Progress"
                fields = list(insert)
                result = connection.execute(text(
                    f"INSERT INTO assessments ({', '.join(f'`{f}`' for f in fields)}) "
                    f"VALUES ({', '.join(':'+f for f in fields)})"
                ), insert)
                assessment_id = int(result.lastrowid)

            # Frontend sends answers as {"questionId": "A"/"B"/"C"/"D"/null}.
            normalized = []
            for raw_id, raw_answer in (request.answers or {}).items():
                try:
                    qid = int(raw_id)
                except (TypeError, ValueError):
                    continue
                selected = str(raw_answer or "").strip().upper()
                normalized.append({"question_id": qid, "selected_answer": selected if selected in ("A", "B", "C", "D") else None})

            # Also accept answers supplied as a list of objects.
            if not normalized and isinstance(request.questions, list):
                for q in request.questions:
                    if not isinstance(q, dict):
                        continue
                    try:
                        qid = int(q.get("question_id", q.get("id")))
                    except (TypeError, ValueError):
                        continue
                    selected = str(q.get("selected_answer", q.get("selectedAnswer", "")) or "").strip().upper()
                    normalized.append({"question_id": qid, "selected_answer": selected if selected in ("A", "B", "C", "D") else None})

            if not normalized:
                raise HTTPException(status_code=400, detail="No valid assessment answers were received.")

            total = attempted = correct = saved = 0
            skill_summary = {}
            for item in normalized:
                qid = item["question_id"]
                qrow = connection.execute(text("""
                    SELECT * FROM assessment_questions
                    WHERE question_id = :qid LIMIT 1
                """), {"qid": qid}).mappings().first()
                if not qrow:
                    # Include the IDs currently available in this exact database/table so
                    # an outdated frontend or wrong database can be diagnosed immediately.
                    available_rows = connection.execute(text(
                        "SELECT question_id FROM assessment_questions ORDER BY question_id LIMIT 50"
                    )).mappings().all()
                    available_ids = [int(r["question_id"]) for r in available_rows]
                    raise HTTPException(status_code=400, detail=(
                        f"Submitted question_id={qid} was not found in the assessment_questions table "
                        f"used by this backend. Available question_id values (first 50): {available_ids}. "
                        "Reload the assessment page and ensure the frontend uses IDs returned by "
                        "GET /api/assessment/questions, not hardcoded 1-15 IDs."
                    ))

                selected = item["selected_answer"]
                correct_raw = str(qrow.get("correct_answer", "") or "").strip()
                correct_normalized = correct_raw.upper()
                # Database may store the correct choice as A-D or as the option text.
                q_payload = _assessment_question_payload(qrow, get_table_columns(connection, "assessment_questions"))
                option_letters = {chr(65 + idx): option for idx, option in enumerate(q_payload["options"])}
                selected_text = option_letters.get(selected, selected) if selected is not None else None
                is_correct = int(
                    selected is not None and (
                        selected == correct_normalized or
                        (selected_text is not None and selected_text.strip().casefold() == correct_raw.casefold())
                    )
                )
                total += 1
                attempted += int(selected is not None)
                correct += is_correct

                old = connection.execute(text("""
                    SELECT answer_id FROM assessment_answers
                    WHERE assessment_id=:aid AND question_id=:qid AND student_id=:sid LIMIT 1
                """), {"aid": assessment_id, "qid": qid, "sid": student_id}).mappings().first()
                values = {"assessment_id": assessment_id, "question_id": qid,
                          "student_id": student_id, "selected_answer": selected, "is_correct": is_correct}
                if old:
                    updates = [f"`{k}`=:{k}" for k in ("selected_answer", "is_correct") if k in answer_cols]
                    if updates:
                        values["answer_id"] = old["answer_id"]
                        connection.execute(text(f"UPDATE assessment_answers SET {', '.join(updates)} WHERE answer_id=:answer_id"), values)
                else:
                    required = ("assessment_id", "question_id", "student_id")
                    if not all(k in answer_cols for k in required):
                        raise HTTPException(status_code=500, detail="assessment_answers is missing required columns.")
                    fields = [k for k in values if k in answer_cols]
                    connection.execute(text(
                        f"INSERT INTO assessment_answers ({', '.join(f'`{k}`' for k in fields)}) "
                        f"VALUES ({', '.join(':'+k for k in fields)})"
                    ), {k: values[k] for k in fields})
                saved += 1

                frontend_q = next((q for q in (request.questions or []) if isinstance(q, dict) and str(q.get("id", q.get("question_id", ""))) == str(qid)), {})
                skill = str(frontend_q.get("skill", frontend_q.get("skill_name", request.skill_name or "General Assessment"))).strip()
                bucket = skill_summary.setdefault(skill, {"total": 0, "attempted": 0, "correct": 0})
                bucket["total"] += 1
                bucket["attempted"] += int(selected is not None)
                bucket["correct"] += is_correct

            percentage = round(correct * 100 / total, 2) if total else 0.0
            wrong = max(attempted - correct, 0)
            unanswered = max(total - attempted, 0)
            feedback = request.feedback or ("Assessment passed." if percentage >= 70 else "Score is below 70%; please retake the assessment.")

            updates = {}
            if "status" in assessment_cols:
                updates["status"] = "Completed"
            if "end_time" in assessment_cols:
                updates["end_time"] = datetime.now()
            if updates:
                connection.execute(text("UPDATE assessments SET " + ", ".join(f"`{k}`=:{k}" for k in updates) + " WHERE assessment_id=:aid"), {**updates, "aid": assessment_id})

            result_id = None
            if table_exists(connection, "assessment_results"):
                result_cols = get_table_columns(connection, "assessment_results")
                candidate = {
                    "student_id": student_id,
                    "skill_name": request.skill_name or "General Assessment",
                    "score": percentage,
                    "feedback": feedback,
                    "assessment_id": assessment_id,
                    "total_questions": total,
                    "attempted": attempted,
                    "correct_answers": correct,
                    "wrong_answers": wrong,
                    "unanswered": unanswered,
                    "percentage": percentage,
                    "accuracy": percentage,
                    "time_taken": max(0, int(request.time_taken or 0)),
                    "completed_at": datetime.now(),
                    "created_at": datetime.now(),
                }
                values = {k: v for k, v in candidate.items() if k in result_cols}
                if "student_id" in values:
                    fields = list(values)
                    inserted = connection.execute(text(
                        f"INSERT INTO assessment_results ({', '.join(f'`{k}`' for k in fields)}) "
                        f"VALUES ({', '.join(':'+k for k in fields)})"
                    ), values)
                    result_id = int(inserted.lastrowid)

                    if table_exists(connection, "assessment_skill_analysis"):
                        analysis_cols = get_table_columns(connection, "assessment_skill_analysis")
                        needed = {"result_id", "skill_id", "questions_attempted", "correct_answers", "score", "strength_level"}
                        if needed.issubset(set(analysis_cols)):
                            for skill, counts in skill_summary.items():
                                skill_row = connection.execute(text("SELECT skill_id FROM skills WHERE LOWER(skill_name)=LOWER(:name) LIMIT 1"), {"name": skill}).mappings().first() if table_exists(connection, "skills") else None
                                if not skill_row:
                                    continue
                                skill_score = round(counts["correct"] * 100 / counts["total"], 2) if counts["total"] else 0
                                strength = "Strong" if skill_score >= 85 else "Good" if skill_score >= 70 else "Average" if skill_score >= 50 else "Needs Improvement"
                                connection.execute(text("""
                                    INSERT INTO assessment_skill_analysis
                                    (result_id, skill_id, questions_attempted, correct_answers, score, strength_level)
                                    VALUES (:rid, :sid, :attempted, :correct, :score, :strength)
                                """), {"rid": result_id, "sid": skill_row["skill_id"], "attempted": counts["attempted"], "correct": counts["correct"], "score": skill_score, "strength": strength})

            return {"message": "Assessment submitted and saved successfully.",
                    "assessment_id": assessment_id, "result_id": result_id,
                    "total": total, "attempted": attempted, "correct": correct,
                    "wrong": wrong, "unanswered": unanswered, "percentage": percentage,
                    "passed": percentage >= 70, "saved_answers": saved, "feedback": feedback}

    except HTTPException:
        raise
    except Exception as e:
        print("ASSESSMENT SUBMISSION ERROR:", str(e))
        raise HTTPException(status_code=500, detail=f"Failed to submit assessment: {str(e)}")


@app.get("/api/assessment-results/{assessment_id}")
def get_single_assessment_result(assessment_id: int):
    """Compatibility endpoint for the result page: fetch by assessment_id."""
    try:
        with engine.connect() as connection:
            if not table_exists(connection, "assessment_results"):
                raise HTTPException(status_code=500, detail="Required table 'assessment_results' does not exist.")

            columns = get_table_columns(connection, "assessment_results")
            if "assessment_id" not in columns:
                raise HTTPException(status_code=500, detail="assessment_results must contain assessment_id.")

            row = connection.execute(text("""
                SELECT * FROM assessment_results
                WHERE assessment_id = :assessment_id
                LIMIT 1
            """), {"assessment_id": assessment_id}).mappings().first()

            if not row:
                raise HTTPException(status_code=404, detail="No saved result was found for this assessment.")

            result = dict(row)
            for key, value in list(result.items()):
                if hasattr(value, "isoformat"):
                    result[key] = value.isoformat()
            return {"result": result}
    except HTTPException:
        raise
    except Exception as e:
        print("GET SINGLE ASSESSMENT RESULT ERROR:", str(e))
        raise HTTPException(status_code=500, detail=f"Failed to load assessment result: {str(e)}")


@app.get("/api/assessments/results/{user_id}")
def get_assessment_results(user_id: int):
    """Fetch previously saved assessment summaries for a student."""
    try:
        with engine.connect() as connection:
            student_id = find_student_id(connection, user_id)
            if not table_exists(connection, "assessment_results"):
                return {"results": []}
            columns = get_table_columns(connection, "assessment_results")
            if "student_id" not in columns:
                raise HTTPException(status_code=500, detail="assessment_results must contain student_id.")
            rows = connection.execute(text("SELECT * FROM assessment_results WHERE student_id=:sid ORDER BY 1 DESC"), {"sid": student_id}).mappings().all()
            output = []
            for row in rows:
                item = dict(row)
                for key, value in list(item.items()):
                    if hasattr(value, "isoformat"):
                        item[key] = value.isoformat()
                output.append(item)
            return {"results": output}
    except HTTPException:
        raise
    except Exception as e:
        print("GET ASSESSMENT RESULTS ERROR:", str(e))
        raise HTTPException(status_code=500, detail=f"Failed to load assessment results: {str(e)}")

# ============================================================
# ELECTROHIRE LIVE AI PROCTORING
# Added without removing the existing database / assessment routes.
# Browser camera frames are sent to POST /api/proctor/frame.
# ============================================================

import base64
import threading

import cv2
import numpy as np
from ultralytics import YOLO
import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision

PROCTOR_DIR = os.path.dirname(os.path.abspath(__file__))
YOLO_MODEL_PATH = os.path.join(PROCTOR_DIR, "yolov8n.pt")
FACE_MODEL_PATH = os.path.join(PROCTOR_DIR, "face_landmarker.task")

_proctor_yolo = None
_proctor_face_landmarker = None
_proctor_model_lock = threading.Lock()


class ProctorFrameRequest(BaseModel):
    # Raw base64 JPEG, optionally also accepts a data:image/jpeg;base64,... URL.
    image: str



def _get_proctor_models():
    """Load the models once, on the first proctoring request."""
    global _proctor_yolo, _proctor_face_landmarker

    with _proctor_model_lock:
        if _proctor_yolo is None:
            if not os.path.isfile(YOLO_MODEL_PATH):
                raise FileNotFoundError(
                    f"YOLO model file not found: {YOLO_MODEL_PATH}"
                )
            _proctor_yolo = YOLO(YOLO_MODEL_PATH)

        if _proctor_face_landmarker is None:
            if not os.path.isfile(FACE_MODEL_PATH):
                raise FileNotFoundError(
                    f"MediaPipe model file not found: {FACE_MODEL_PATH}"
                )
            options = vision.FaceLandmarkerOptions(
                base_options=mp_python.BaseOptions(
                    model_asset_path=FACE_MODEL_PATH
                ),
                running_mode=vision.RunningMode.IMAGE,
                num_faces=2,
                output_face_blendshapes=False,
                output_facial_transformation_matrixes=False,
            )
            _proctor_face_landmarker = (
                vision.FaceLandmarker.create_from_options(options)
            )

    return _proctor_yolo, _proctor_face_landmarker


def _estimate_eye_direction(landmarks):
    """Approximate horizontal iris position; this is not proof of cheating."""
    # Face Landmarker models that output iris landmarks provide 468 and 473.
    if len(landmarks) <= 473:
        return "unavailable"

    def ratio(iris_idx, corner_a, corner_b):
        iris_x = landmarks[iris_idx].x
        a = landmarks[corner_a].x
        b = landmarks[corner_b].x
        eye_width = abs(b - a)
        if eye_width < 1e-6:
            return 0.5
        return (iris_x - min(a, b)) / eye_width

    left_ratio = ratio(468, 33, 133)
    right_ratio = ratio(473, 362, 263)
    average = (left_ratio + right_ratio) / 2.0

    if average < 0.38:
        return "left"
    if average > 0.62:
        return "right"
    return "center"


@app.post("/api/proctor/frame")
def analyze_proctor_frame(request: ProctorFrameRequest):
    """Analyze one JPEG frame and return possible proctoring warnings."""
    try:
        encoded = request.image.strip()
        if encoded.startswith("data:") and "," in encoded:
            encoded = encoded.split(",", 1)[1]

        image_bytes = base64.b64decode(encoded, validate=True)
        if not image_bytes:
            raise ValueError("Image data is empty")

        encoded_image = np.frombuffer(image_bytes, dtype=np.uint8)
        frame = cv2.imdecode(encoded_image, cv2.IMREAD_COLOR)
        if frame is None:
            raise ValueError("The supplied data is not a valid image")

        height, width = frame.shape[:2]
        if width > 960:
            scale = 960.0 / width
            frame = cv2.resize(
                frame,
                (960, max(1, int(height * scale))),
                interpolation=cv2.INTER_AREA,
            )

        yolo_model, face_model = _get_proctor_models()

        # COCO class 67 is cell phone for standard YOLOv8 COCO weights.
        prediction = yolo_model.predict(
            source=frame,
            imgsz=640,
            conf=0.40,
            classes=[67],
            verbose=False,
        )

        phones = []
        for result in prediction:
            for box in result.boxes:
                phones.append({
                    "confidence": round(float(box.conf[0]), 3),
                    "box": [round(float(v), 1) for v in box.xyxy[0].tolist()],
                })

        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        face_result = face_model.detect(mp_image)
        face_landmarks = face_result.face_landmarks
        face_count = len(face_landmarks)
        gaze_directions = [
            _estimate_eye_direction(face) for face in face_landmarks
        ]

        warnings = []
        if phones:
            warnings.append("Possible mobile phone detected.")
        if face_count == 0:
            warnings.append("No face detected. Please face the camera.")
        elif face_count > 1:
            warnings.append("More than one face detected.")
        if any(direction in ("left", "right") for direction in gaze_directions):
            warnings.append(
                "Gaze appears away from the center; normal movement can cause this warning."
            )

        return {
            "success": True,
            "phone_detected": bool(phones),
            "phones": phones,
            "face_count": face_count,
            "gaze_directions": gaze_directions,
            "warnings": warnings,
        }

    except (ValueError, TypeError) as exc:
        raise HTTPException(status_code=400, detail=f"Invalid camera frame: {exc}")
    except HTTPException:
        raise
    except Exception as exc:
        print("PROCTOR FRAME ERROR:", repr(exc))
        raise HTTPException(
            status_code=500,
            detail="Proctoring analysis failed. Check the backend terminal.",
        )



# ============================================================
# STUDENT DASHBOARD SUMMARY
# ============================================================
# Returns live counts from the existing database tables.
# The frontend can call GET /api/student/dashboard/{user_id}.
# ============================================================

@app.get("/api/student/dashboard/{user_id}")
def get_student_dashboard(user_id: int):
    try:
        with engine.connect() as connection:
            user = get_user_by_id(connection, user_id)
            if not user:
                raise HTTPException(status_code=404, detail="User not found.")

            role = str(user.get("role", "")).strip().lower()
            if role != "student":
                raise HTTPException(
                    status_code=403,
                    detail="This dashboard endpoint is for student accounts."
                )

            student_row = connection.execute(
                text("""
                    SELECT *
                    FROM student_details
                    WHERE user_id = :user_id
                    LIMIT 1
                """),
                {"user_id": user_id},
            ).mappings().first()

            if not student_row:
                raise HTTPException(
                    status_code=404,
                    detail="Student profile not found. Please save your profile first."
                )

            profile = dict(student_row)
            profile_fields = [
                "full_name", "phone", "date_of_birth", "gender", "college",
                "degree", "branch", "year", "semester", "cgpa", "location",
                "career_objective", "preferred_role", "linkedin_url", "github_url",
            ]
            users_columns = get_table_columns(connection, "users")
            completed_fields = 0
            total_fields = len(profile_fields)

            for field in profile_fields:
                value = user.get(field) if field in users_columns else profile.get(field)
                if value is not None and str(value).strip() != "":
                    completed_fields += 1

            profile_completion = round((completed_fields / total_fields) * 100) if total_fields else 0

            def count_student_rows(table_name, foreign_key="student_id"):
                if not table_exists(connection, table_name):
                    return 0
                columns = get_table_columns(connection, table_name)
                key = foreign_key if foreign_key in columns else (
                    "user_id" if "user_id" in columns else None
                )
                if not key:
                    return 0
                query = text(
                    f"SELECT COUNT(*) AS total FROM `{table_name}` WHERE `{key}` = :uid"
                )
                row = connection.execute(query, {"uid": user_id}).mappings().first()
                return int(row["total"] or 0) if row else 0

            skills_count = count_student_rows("student_skills")
            projects_count = count_student_rows("projects")
            certificates_count = count_student_rows("certificates")
            resumes_count = count_student_rows("resumes")
            assessment_count = count_student_rows("assessment_results")

            applications_count = 0
            shortlisted_count = 0
            if table_exists(connection, "applications"):
                app_columns = get_table_columns(connection, "applications")
                if "student_id" in app_columns:
                    applications_count = int(connection.execute(
                        text("SELECT COUNT(*) AS total FROM applications WHERE student_id = :uid"),
                        {"uid": user_id},
                    ).mappings().first()["total"] or 0)

                    status_column = (
                        "application_status" if "application_status" in app_columns
                        else "status" if "status" in app_columns
                        else None
                    )
                    if status_column:
                        shortlisted_count = int(connection.execute(
                            text(
                                f"SELECT COUNT(*) AS total FROM applications "
                                f"WHERE student_id = :uid AND LOWER(`{status_column}`) = 'shortlisted'"
                            ),
                            {"uid": user_id},
                        ).mappings().first()["total"] or 0)

            return {
                "user_id": user_id,
                "full_name": user.get("full_name"),
                "email": user.get("email"),
                "profile_completion": profile_completion,
                "counts": {
                    "skills": skills_count,
                    "projects": projects_count,
                    "certificates": certificates_count,
                    "resumes": resumes_count,
                    "assessments": assessment_count,
                    "applications": applications_count,
                    "shortlisted": shortlisted_count,
                },
            }

    except HTTPException:
        raise
    except Exception as exc:
        print("STUDENT DASHBOARD ERROR:", repr(exc))
        raise HTTPException(
            status_code=500,
            detail=f"Failed to load student dashboard: {str(exc)}",
        )
