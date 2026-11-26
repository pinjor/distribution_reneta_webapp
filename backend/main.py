from app.api_app import create_api_app

# Production entrypoint. Provisional Submit/Approve/Reject are not registered.
app = create_api_app(isolated_workflow=False)
