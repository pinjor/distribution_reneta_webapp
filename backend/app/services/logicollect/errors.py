from fastapi import HTTPException


class LcError(HTTPException):
    def __init__(self, status_code: int, code: str, message: str):
        super().__init__(status_code=status_code, detail={"code": code, "message": message})
        self.lc_code = code
        self.lc_message = message
