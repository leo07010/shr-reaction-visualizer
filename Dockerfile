# SHR Reaction Visualizer - Docker Image
# Serves both the Flask Python RDKit API and static frontend files

FROM continuumio/miniconda3:latest

WORKDIR /app

# Install RDKit via conda (most reliable method)
# Pin numpy<2.0 to avoid X86_V2 CPU requirement on older servers
RUN conda install -y -c conda-forge rdkit python=3.11 "numpy<2.0" && \
    conda clean -afy

# Install Python dependencies
COPY backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir flask flask-cors gunicorn

# Copy all project files
COPY . /app

# Expose port 3000
EXPOSE 3000

# Run with gunicorn (production WSGI server)
CMD ["gunicorn", "--bind", "0.0.0.0:3000", "--workers", "2", "--timeout", "60", "backend.app:app"]
