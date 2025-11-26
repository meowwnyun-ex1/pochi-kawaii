import asyncio
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from dotenv import load_dotenv
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

from services.hf_client_service import HuggingFaceClientService

class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

async def test_huggingface_connection() -> bool:
    print(f"{Colors.HEADER}{Colors.BOLD}")
    print("=" * 80)
    print("       HuggingFace Connection Test")
    print("=" * 80)
    print(f"{Colors.ENDC}\n")

    print(f"{Colors.WARNING}{Colors.BOLD}⚠ IMPORTANT DISCLAIMER: {Colors.ENDC}")
    print("This AI provides general information only and is not a substitute for professional medical advice.")
    print("Always consult a qualified healthcare provider for diagnosis and treatment.")
    print("Do not rely on this for medical decisions.\n")

    hf_token = os.getenv("HUGGINGFACE_API_TOKEN")
    hf_base_url = os.getenv("HUGGINGFACE_BASE_URL")
    hf_model = os.getenv("HUGGINGFACE_MODEL")
    hf_timeout_str = os.getenv("HUGGINGFACE_TIMEOUT", "60")

    if not hf_token or not hf_base_url or not hf_model:
        print(f"{Colors.FAIL}ERROR: Missing required environment variables{Colors.ENDC}")
        print("   Required: HUGGINGFACE_API_TOKEN, HUGGINGFACE_BASE_URL, HUGGINGFACE_MODEL")
        return False

    try:
        hf_timeout = int(hf_timeout_str)
    except ValueError:
        print(f"{Colors.FAIL}ERROR: HUGGINGFACE_TIMEOUT must be a number{Colors.ENDC}")
        return False

    print(f"{Colors.OKCYAN}Configuration:{Colors.ENDC}")
    print(f"  Token: {hf_token[:20]}...")
    print(f"  Model: {hf_model}")
    print(f"  Base URL: {hf_base_url}")
    print(f"  Timeout: {hf_timeout}s\n")

    service = HuggingFaceClientService(
        api_token=hf_token,
        base_url=hf_base_url,
        model=hf_model,
        timeout=hf_timeout
    )

    test_questions = [
        {"lang": "en", "question": "What are common symptoms associated with diabetes?", "expected_keywords": ["blood", "sugar", "thirst", "urination", "fatigue"]},
        {"lang": "th", "question": "อาการทั่วไปที่เกี่ยวข้องกับโรคเบาหวานคืออะไร", "expected_keywords": ["น้ำตาล", "กระหาย", "ปัสสาวะ", "เบาหวาน"]},
        {"lang": "ja", "question": "糖尿病に関連する一般的な症状は何ですか", "expected_keywords": ["血糖", "のどの渇き", "排尿", "疲労"]}
    ]

    all_passed = True

    for idx, test in enumerate(test_questions, 1):
        print(f"{Colors.BOLD}Test {idx}: {test['lang'].upper()}{Colors.ENDC}")
        print(f"Question: {test['question']}\n")

        try:
            response = await service.generate_response(test['question'], test['lang'])

            if response:
                print(f"{Colors.OKGREEN}Response received{Colors.ENDC}")
                print(f"Response length: {len(response)} chars")
                print(f"Preview: {response[:200]}...\n")

                response_lower = response.lower()
                found = [kw for kw in test['expected_keywords'] if kw.lower() in response_lower]

                if found:
                    print(f"{Colors.OKGREEN}Found keywords: {', '.join(found)}{Colors.ENDC}\n")
                else:
                    print(f"{Colors.WARNING}No expected keywords found{Colors.ENDC}\n")

                print(f"{Colors.WARNING}Reminder: This is general information. Consult a doctor.{Colors.ENDC}\n")
            else:
                print(f"{Colors.FAIL}No response received{Colors.ENDC}\n")
                all_passed = False
        except Exception as e:
            print(f"{Colors.FAIL}Error: {str(e)}{Colors.ENDC}\n")
            all_passed = False

        print("-" * 80 + "\n")

    print(f"{Colors.HEADER}{Colors.BOLD}")
    print("=" * 80)
    print(f"{Colors.OKGREEN}ALL TESTS PASSED{Colors.ENDC}" if all_passed else f"{Colors.FAIL}SOME TESTS FAILED{Colors.ENDC}")
    print("=" * 80)
    print(f"{Colors.ENDC}\n")

    return all_passed

if __name__ == "__main__":
    try:
        result = asyncio.run(test_huggingface_connection())
        sys.exit(0 if result else 1)
    except KeyboardInterrupt:
        print(f"\n{Colors.WARNING}Test interrupted by user{Colors.ENDC}")
        sys.exit(1)
    except Exception as e:
        print(f"\n{Colors.FAIL}An unexpected error occurred: {str(e)}{Colors.ENDC}")
        sys.exit(1)