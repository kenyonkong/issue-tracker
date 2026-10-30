from enum import Enum

from fastapi import FastAPI, status
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


@app.get("/api/issues", response_model=list[Issue])
def get_issues() -> list[Issue]:
    return issues


@app.post("/api/issues", response_model=Issue, status_code=status.HTTP_201_CREATED)
def create_issue(issue_data: IssueCreate) -> Issue:
    global next_issue_id
    issue = Issue(id=next_issue_id, **issue_data.model_dump())
    next_issue_id += 1
    issues.append(issue)
    return issue

