import os
import time
import wave
import audioop
import pyaudio
import speech_recognition as sr
import google.generativeai as genai
import pygame
from dotenv import load_dotenv
from elevenlabs.client import ElevenLabs

# 1. AYARLARI YÜKLE (.env dosyasından)
load_dotenv()
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")

# API Key Kontrolü
if not GOOGLE_API_KEY or not ELEVENLABS_API_KEY:
    print("❌ HATA: .env dosyasında API anahtarları eksik!")
    print("Lütfen .env dosyasına GOOGLE_API_KEY ve ELEVENLABS_API_KEY ekleyin.")
    exit()

genai.configure(api_key=GOOGLE_API_KEY)

# SES AYARLARI
CHUNK = 1024
FORMAT = pyaudio.paInt16
CHANNELS = 1
RATE = 16000 # Hız ve STT uyumu için 16kHz ideal
SILENCE_LIMIT = 1.5 # Saniye
MAX_DURATION = 30   # Saniye

def get_ambient_noise(stream):
    """Ortam gürültüsünü ölçüp eşik değerini belirler"""
    print("🤫 Ortam dinleniyor (Lütfen 1 sn konuşmayın)...")
    noise_values = []
    
    # 1 saniye boyunca ortamı dinle
    for _ in range(0, int(RATE / CHUNK * 1)):
        data = stream.read(CHUNK)
        rms = audioop.rms(data, 2)
        noise_values.append(rms)
    
    if not noise_values: return 500
    
    avg_noise = sum(noise_values) / len(noise_values)
    
    # Gürültü seviyesinin üzerine +500 ekleyerek eşik belirliyoruz
    threshold = max(300, avg_noise + 500)
    print(f"✅ Kalibrasyon Tamam! Eşik: {int(threshold)}")
    return threshold

def record_audio_smart(filename):
    """Sessizliği algılayıp kaydı bitiren akıllı fonksiyon"""
    p = pyaudio.PyAudio()
    stream = p.open(format=FORMAT, channels=CHANNELS, rate=RATE, input=True, frames_per_buffer=CHUNK)

    # 1. Kalibrasyon
    THRESHOLD = get_ambient_noise(stream)
    
    print("🎤 Şimdi Konuşabilirsin! (Sustuğunda otomatik duracak)")

    frames = []
    silent_chunks = 0
    speaking_started = False
    start_time = time.time()

    while True:
        data = stream.read(CHUNK)
        frames.append(data)
        
        rms = audioop.rms(data, 2)

        # Maksimum süre kontrolü
        if time.time() - start_time > MAX_DURATION:
            print("⏳ Maksimum süre doldu.")
            break

        # Konuşma başladı mı?
        if rms > THRESHOLD:
            speaking_started = True
            silent_chunks = 0
        elif speaking_started:
            silent_chunks += 1

        # Sessizlik limiti doldu mu?
        if speaking_started and (silent_chunks > (SILENCE_LIMIT * RATE / CHUNK)):
            print("✅ Konuşma bitti.")
            break

    stream.stop_stream()
    stream.close()
    p.terminate()

    # Dosyayı kaydet
    wf = wave.open(filename, 'wb')
    wf.setnchannels(CHANNELS)
    wf.setsampwidth(p.get_sample_size(FORMAT))
    wf.setframerate(RATE)
    wf.writeframes(b''.join(frames))
    wf.close()

def play_audio(file_path):
    """Pygame ile ses çalar ve dosyayı siler"""
    try:
        pygame.mixer.init()
        pygame.mixer.music.load(file_path)
        pygame.mixer.music.play()
        
        # Çalma bitene kadar bekle
        while pygame.mixer.music.get_busy():
            pygame.time.Clock().tick(10)
            
        pygame.mixer.quit()
        
        # Temizlik
        if os.path.exists(file_path):
            os.remove(file_path)
            
    except Exception as e:
        print(f"Oynatma Hatası: {e}")

def speak_elevenlabs(text):
    """ElevenLabs v1.0+ Uyumlu Seslendirme"""
    try:
        client = ElevenLabs(api_key=ELEVENLABS_API_KEY)
        print("🔊 Ses oluşturuluyor (ElevenLabs)...")
        
        # Rachel Ses ID'si: 21m00Tcm4TlvDq8ikWAM
        # (İsim yerine ID kullanmak daha güvenilirdir)
        audio_stream = client.text_to_speech.convert(
            text=text,
            voice_id="21m00Tcm4TlvDq8ikWAM",
            model_id="eleven_multilingual_v2",
            output_format="mp3_44100_128"
        )
        
        output_file = "response_eleven_pipe.mp3"
        
        # Gelen stream'i dosyaya yaz (v1.0+ yöntemi)
        with open(output_file, "wb") as f:
            for chunk in audio_stream:
                if chunk:
                    f.write(chunk)
        
        play_audio(output_file)
        
    except Exception as e:
        print(f"❌ ElevenLabs Hatası: {e}")
        print("💡 İpucu: ElevenLabs kotanız dolmuş olabilir.")

def pipeline_flow():
    audio_file = "pipeline_input.wav"
    
    # 1. KAYIT
    record_audio_smart(audio_file)

    # 2. SESİ YAZIYA ÇEVİR (STT)
    print("👂 Yazıya çevriliyor...")
    recognizer = sr.Recognizer()
    abs_path = os.path.abspath(audio_file)

    with sr.AudioFile(abs_path) as source:
        try:
            # Google Speech Recognition (Ücretsiz)
            audio_data = recognizer.record(source)
            user_text = recognizer.recognize_google(audio_data, language="tr-TR")
            print(f"🗣️ Sen: {user_text}")
            
        except sr.UnknownValueError:
            print("❌ Ses anlaşılamadı (Çok sessiz olabilir).")
            return
        except sr.RequestError:
            print("❌ İnternet bağlantı hatası (STT).")
            return

    # 3. YAPAY ZEKA (Gemini)
    print("🧠 Gemini düşünüyor...")
    try:
        model = genai.GenerativeModel(
            "gemini-flash-latest",
            system_instruction="Sen samimi, dert ortağı bir arkadaşsın. Doğal, kısa ve konuşma dilinde Türkçe cevap ver."
        )
        
        response = model.generate_content(f"Kullanıcı dedi ki: {user_text}")
        ai_text = response.text
        print(f"🤖 Gemini: {ai_text}")

        # 4. SESLENDİRME (ElevenLabs)
        if ai_text:
            speak_elevenlabs(ai_text)
            
    except Exception as e:
        print(f"❌ Gemini Hatası: {e}")

if __name__ == "__main__":
    pipeline_flow()