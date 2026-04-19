from typing import List, Literal, Optional
from pydantic import BaseModel, Field, model_validator


class DiffOptions(BaseModel):
    contextLines: int = Field(default=3, ge=0, le=10)
    maxDiffChunks: int = Field(default=200, ge=1, le=500)


class DiffRequest(BaseModel):
    mode: Literal["text", "json"]
    granularity: Optional[Literal["line", "word", "path"]] = "line"
    a: str
    b: str
    options: DiffOptions = DiffOptions()

    @model_validator(mode="after")
    def validate_granularity(self):
        if self.mode == "text" and self.granularity not in {"line", "word"}:
            raise ValueError("granularity must be line or word for text mode")
        if self.mode == "json" and self.granularity not in {"path", None, "line"}:
            self.granularity = "path"
        if self.mode == "json":
            self.granularity = "path"
        if not self.a or not self.b:
            raise ValueError("a and b must be non-empty")
        return self


class DiffChunk(BaseModel):
    type: Literal["add", "remove", "change"]
    aStart: int
    aEnd: int
    bStart: int
    bEnd: int
    a: List[str]
    b: List[str]


class DiffSummary(BaseModel):
    mode: str
    granularity: str
    adds: int
    removes: int
    changes: int


class DiffResponse(BaseModel):
    id: str
    summary: DiffSummary
    diff: dict


class HistoryItem(BaseModel):
    id: str
    mode: str
    granularity: str
    createdAt: str
    aHash: str
    bHash: str
    summary: dict


class HistoryResponse(BaseModel):
    items: List[HistoryItem]


class RunResponse(BaseModel):
    id: str
    mode: str
    granularity: str
    result: dict
    createdAt: str
