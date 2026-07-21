from openai import AzureOpenAI

# 1. الرابط واسم النشر
endpoint = "https://zu3l-2556-resource.services.ai.azure.com/"
deployment_name = "gpt-5.4"

# 2. المفتاح السري 
api_key = "1LlyBU9VVDtyjCaYa8U6NSgGIlTlvucqBG0K2T1sTZFx32yp33PmJQQJ99CGACrIdLPXJ3w3AAAAACOGgqCS"

# 3. تهيئة الاتصال (هنا أضفنا api_version اللي طلبته مايكروسوفت)
client = AzureOpenAI(
    azure_endpoint=endpoint,
    api_key=api_key,
    api_version="2024-02-15-preview" 
)

# 4. إرسال السؤال للذكاء الاصطناعي بالطريقة الصحيحة
response = client.chat.completions.create(
    model=deployment_name,
    messages=[
        {"role": "user", "content": "What is the capital of France?"}
    ]
)

# 5. طباعة الإجابة
print(f"answer: {response.choices[0].message.content}")