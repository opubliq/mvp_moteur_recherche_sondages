from transformers import AutoTokenizer, AutoModel
from optimum.onnxruntime import ORTModelForFeatureExtraction
from optimum.exporters.onnx import main_export

model_name = "sentence-transformers/all-MiniLM-L6-v2"
onnx_dir = "models/all-MiniLM-L6-v2-onnx"

main_export(
    model_name_or_path=model_name,
    output=onnx_dir,
    task="feature-extraction",
)
