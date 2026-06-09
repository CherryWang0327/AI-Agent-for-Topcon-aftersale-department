FROM node:20-alpine AS ui-builder

WORKDIR /frontend/report-ui

COPY report-ui/package*.json ./
RUN npm ci

COPY report-ui ./
RUN npm run build

FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py .
COPY --from=ui-builder /frontend/report-ui/dist ./report-ui/dist

ENV TEMPLATE_PATH="/templates/Support Request Form.xlsx"
ENV SHEET_NAME="Sheet1"

EXPOSE 8000

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
