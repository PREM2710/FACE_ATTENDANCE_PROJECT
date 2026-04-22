FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    gcc \
    g++ \
    libglib2.0-0 \
    libgl1 \
    libsm6 \
    libxext6 \
    libxrender1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./requirements.txt
RUN grep -viE "^(comtypes|pypiwin32|pywin32|pyttsx3)==" requirements.txt > requirements.docker.txt
RUN pip install --upgrade pip setuptools wheel
RUN pip install -r requirements.docker.txt

COPY . .

EXPOSE 5000

CMD ["python", "app.py"]