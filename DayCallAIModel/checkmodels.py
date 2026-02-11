import google.generativeai as genai

# API KEY'İNİ BURAYA YAZ
GOOGLE_API_KEY = "AIzaSyC4K9FjFqWH70W671uf5npcOSMvsabywoM"

genai.configure(api_key=GOOGLE_API_KEY)

print("🔍 Erişilebilen Modeller Listeleniyor...")
try:
    for m in genai.list_models():
        # Sadece içerik üretebilen (chat) modelleri filtrele
        if 'generateContent' in m.supported_generation_methods:
            print(f"✅ {m.name}")
except Exception as e:
    print(f"❌ Hata: {e}")