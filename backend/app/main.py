from enum import Enum

from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel, ConfigDict, field_validator


class IssueStatus(str, Enum):
    OPEN = "Open"
    IN_PROGRESS = "In Progress"
    RESOLVED = "Resolved"


class IssuePriority(str, Enum):
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"


class IssueCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    title: str
    description: str = ""
    status: IssueStatus
    priority: IssuePriority

    @field_validator("title")
    @classmethod
    def title_must_not_be_blank(cls, value: str) -> str:
        if not value:
            raise ValueError("Title must not be blank")
        return value


class Issue(IssueCreate):
    id: int


app = FastAPI(title="Issue Tracker API")
issues: list[Issue] = []
next_issue_id = 1


def normalize_title(title: str) -> str:
    """Normalize harmless casing and whitespace differences for comparison."""
    return " ".join(title.split()).casefold()


@app.get("/api/issues", response_model=list[Issue])
def get_issues() -> list[Issue]:
    return issues


@app.post("/api/issues", response_model=Issue, status_code=status.HTTP_201_CREATED)
def create_issue(issue_data: IssueCreate) -> Issue:
    global next_issue_id

    normalized_title = normalize_title(issue_data.title)
    duplicate = next(
        (
            issue
            for issue in issues
            if issue.status in {IssueStatus.OPEN, IssueStatus.IN_PROGRESS}
            and normalize_title(issue.title) == normalized_title
        ),
        None,
    )
    if duplicate is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f'An active issue with this title already exists (issue #{duplicate.id}).',
        )

    issue = Issue(id=next_issue_id, **issue_data.model_dump())
    next_issue_id += 1
    issues.append(issue)
    return issue

