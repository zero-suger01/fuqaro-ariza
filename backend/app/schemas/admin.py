from datetime import date

from pydantic import BaseModel


class DashboardStats(BaseModel):
    today: int
    this_week: int
    this_month: int
    resolved: int
    in_progress: int


class MonthlyPoint(BaseModel):
    month: str
    count: int


class CategoryPoint(BaseModel):
    category: str
    count: int


class ResolutionTimeStats(BaseModel):
    average_hours: float | None
    resolved_count: int


class TopIssue(BaseModel):
    category: str
    count: int


class StatsResponse(BaseModel):
    monthly: list[MonthlyPoint]
    by_category: list[CategoryPoint]
    resolution_time: ResolutionTimeStats
    top_issues: list[TopIssue]
