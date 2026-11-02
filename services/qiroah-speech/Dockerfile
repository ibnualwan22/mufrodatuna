FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir torch==2.5.1 --index-url https://download.pytorch.org/whl/cpu \
    && pip install --no-cache-dir -r requirements.txt
COPY app.py ./
ENV HF_HOME=/model-cache
EXPOSE 8891
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8891"]
