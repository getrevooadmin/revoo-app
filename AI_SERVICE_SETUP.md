# AI Service Setup Guide (using uv)

Follow these steps to initialize and build the Python service from scratch.

---

## 1. What is `uv`?
`uv` is an extremely fast Python package and project manager written in Rust by Astral. It replaces:
* `pip` (package installation)
* `pip-tools` (dependency locking)
* `virtualenv` (environment isolation)
* `pyenv` (Python version management)

---

## 2. Step-by-Step Setup

### Step 1: Install `uv`
Run the official installation script or use Homebrew (on macOS):

```bash
# Via curl installation script
curl -LsSf https://astral.sh/uv/install.sh | sh

# OR via Homebrew
brew install uv
```
*Note: Restart your terminal or reload your shell profile (e.g., `source ~/.zshrc`) after installation.*

### Step 2: Initialize the Project
From the root of the `beautiful-hertz` repository, run:

```bash
uv init ai-service
```
This creates the `ai-service` folder containing:
* `pyproject.toml` — package metadata and dependencies.
* `.python-version` — configures which Python version to use.
* `hello.py` — a boilerplate starting script.

Navigate into the folder:
```bash
cd ai-service
```

### Step 3: Add Dependencies
Install the required packages. `uv` will automatically download Python, construct a virtual environment (`.venv/`), and update `pyproject.toml` and `uv.lock`:

```bash
uv add fastapi uvicorn openai pydantic mangum
```

### Step 4: Write the Application
Rename `hello.py` to `main.py` or create a new `main.py` file with the following contents:

```python
from fastapi import FastAPI
from mangum import Mangum

app = FastAPI(title="Beautiful Hertz AI Service")

@app.get("/")
def read_root():
    return {"message": "Hello from AI Service!"}

# Mangum adapter for AWS Lambda deployment
handler = Mangum(app)
```

### Step 5: Run the Development Server
Use `uv run` to run the development server within the virtual environment:

```bash
uv run uvicorn main:app --reload
```

---

## 3. Useful `uv` Commands

* **Add a new dependency**: `uv add <package_name>`
* **Remove a dependency**: `uv remove <package_name>`
* **Run a script/command**: `uv run <command>` (e.g., `uv run python script.py`)
* **Sync environment**: `uv sync` (updates virtual environment to match `pyproject.toml`/`uv.lock`)
