"""
Test Ollama Connection
Verifies Ollama API connectivity and GPU acceleration
"""

import requests
import subprocess
import sys
import logging
import json

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def check_gpu():
    """Check if GPU is available using nvidia-smi"""
    print("\n" + "="*50)
    print("GPU Check")
    print("="*50)
    
    try:
        output = subprocess.check_output(['nvidia-smi', '--query-gpu=index,name,memory.total', '--format=csv,noheader'], 
                                        stderr=subprocess.STDOUT, text=True)
        print("✓ NVIDIA GPU detected:")
        for line in output.strip().split('\n'):
            print(f"  {line}")
        return True
    except FileNotFoundError:
        print("⚠ nvidia-smi not found (GPU may not be available)")
        print("  You can still run Ollama on CPU, but it will be slower")
        return False
    except Exception as e:
        print(f"⚠ GPU check failed: {e}")
        return False


def test_ollama_connection():
    """Test Ollama API connection"""
    print("\n" + "="*50)
    print("Ollama Connection Test")
    print("="*50)
    
    ollama_url = "http://localhost:11434"
    
    try:
        # Test /api/tags endpoint
        response = requests.get(f"{ollama_url}/api/tags", timeout=5)
        
        if response.status_code == 200:
            print(f"✓ Connected to Ollama API")
            
            models = response.json().get('models', [])
            if models:
                print(f"✓ Available models:")
                for model in models:
                    print(f"  - {model['name']} ({model['size']} bytes)")
            else:
                print(f"⚠ No models found. Download llama2:")
                print(f"  ollama pull llama2")
            
            return True
        else:
            print(f"✗ Ollama API returned status {response.status_code}")
            return False
            
    except requests.ConnectionError:
        print(f"✗ Could not connect to Ollama at {ollama_url}")
        print(f"  Make sure Ollama is running:")
        print(f"  ollama serve")
        return False
    except Exception as e:
        print(f"✗ Ollama test failed: {e}")
        return False


def test_ollama_inference():
    """Test Ollama inference with a simple prompt"""
    print("\n" + "="*50)
    print("Ollama Inference Test")
    print("="*50)
    
    ollama_url = "http://localhost:11434"
    
    try:
        payload = {
            "model": "llama2",
            "prompt": "What is 2+2? Answer in one word.",
            "stream": False,
        }
        
        response = requests.post(
            f"{ollama_url}/api/generate",
            json=payload,
            timeout=60,  # Inference can take time
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✓ Inference successful")
            print(f"  Prompt: {payload['prompt']}")
            print(f"  Response: {result['response']}")
            print(f"  Load time: {result.get('load_duration', 0) / 1e9:.2f}s")
            print(f"  Eval time: {result.get('eval_duration', 0) / 1e9:.2f}s")
            return True
        else:
            print(f"✗ Inference failed with status {response.status_code}")
            return False
            
    except requests.ConnectionError:
        print(f"⚠ Ollama not running or model not available")
        return False
    except requests.Timeout:
        print(f"⚠ Inference timeout (model may not be downloaded)")
        return False
    except Exception as e:
        print(f"✗ Inference test failed: {e}")
        return False


if __name__ == "__main__":
    print("\n" + "="*60)
    print("OLLAMA + GPU TEST SUITE")
    print("="*60)
    
    gpu_ok = check_gpu()
    
    api_ok = test_ollama_connection()
    
    if api_ok:
        inference_ok = test_ollama_inference()
    else:
        inference_ok = False
    
    print("\n" + "="*60)
    print("Test Summary:")
    print(f"  GPU Check: {'✓' if gpu_ok else '⚠'}")
    print(f"  Ollama API: {'✓' if api_ok else '✗'}")
    print(f"  Inference: {'✓' if inference_ok else '⚠'}")
    print("="*60)
    
    if api_ok:
        print("\n✅ Ollama is ready to use!")
    else:
        print("\n⚠ Ollama setup incomplete. Run: ollama serve")
    
    sys.exit(0 if api_ok else 1)