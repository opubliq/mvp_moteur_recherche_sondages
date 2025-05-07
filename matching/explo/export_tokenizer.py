from transformers import AutoTokenizer

tokenizer = AutoTokenizer.from_pretrained("sentence-transformers/all-MiniLM-L6-v2")
tokenizer.save_pretrained("models/all-MiniLM-L6-v2-onnx/tokenizer")