import os
import time
import wave
import audioop
import pyaudio
import google.generativeai as genai
import pygame
from dotenv import load_dotenv
from elevenlabs.client import ElevenLabs
# save fonksiyonunu kaldırdık, manuel kaydedeceğiz.

# 1. AYARLARI YÜKLE
load_dotenv()
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")

if not GOOGLE_API_KEY or not ELEVENLABS_API_KEY:
    print("❌ HATA: .env dosyasında API anahtarları eksik!")
    exit()

genai.configure(api_key=GOOGLE_API_KEY)

# SES AYARLARI
CHUNK = 1024
FORMAT = pyaudio.paInt16
CHANNELS = 1
RATE = 16000
SILENCE_LIMIT = 1.5
MAX_DURATION = 30

def get_ambient_noise(stream):
    """Ortam gürültüsünü ölçüp eşik değerini belirler"""
    print("🤫 Ortam dinleniyor (Lütfen 1 sn konuşmayın)...")
    noise_values = []
    for _ in range(0, int(RATE / CHUNK * 1)):
        data = stream.read(CHUNK)
        rms = audioop.rms(data, 2)
        noise_values.append(rms)
    
    if not noise_values: return 500
    
    avg_noise = sum(noise_values) / len(noise_values)
    threshold = max(300, avg_noise + 500)
    print(f"✅ Kalibrasyon Tamam! Eşik: {int(threshold)}")
    return threshold

def record_audio_smart(filename):
    """Akıllı kayıt fonksiyonu"""
    p = pyaudio.PyAudio()
    stream = p.open(format=FORMAT, channels=CHANNELS, rate=RATE, input=True, frames_per_buffer=CHUNK)

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

        if time.time() - start_time > MAX_DURATION:
            print("⏳ Maksimum süre doldu.")
            break

        if rms > THRESHOLD:
            speaking_started = True
            silent_chunks = 0
        elif speaking_started:
            silent_chunks += 1

        if speaking_started and (silent_chunks > (SILENCE_LIMIT * RATE / CHUNK)):
            print("✅ Konuşma bitti.")
            break

    stream.stop_stream()
    stream.close()
    p.terminate()

    wf = wave.open(filename, 'wb')
    wf.setnchannels(CHANNELS)
    wf.setsampwidth(p.get_sample_size(FORMAT))
    wf.setframerate(RATE)
    wf.writeframes(b''.join(frames))
    wf.close()

def play_audio(file_path):
    """Pygame ile ses çalar"""
    try:
        pygame.mixer.init()
        pygame.mixer.music.load(file_path)
        pygame.mixer.music.play()
        while pygame.mixer.music.get_busy():
            pygame.time.Clock().tick(10)
        pygame.mixer.quit()
        if os.path.exists(file_path):
            os.remove(file_path)
    except Exception as e:
        print(f"Oynatma Hatası: {e}")

def speak_elevenlabs(text):
    """ElevenLabs v1.0+ Uyumlu Seslendirme"""
    try:
        client = ElevenLabs(api_key=ELEVENLABS_API_KEY)
        print("🔊 Ses oluşturuluyor (ElevenLabs)...")
        
        # GÜNCELLENEN KISIM:
        audio_stream = client.text_to_speech.convert(
            text=text,
            voice_id="21m00Tcm4TlvDq8ikWAM", # Rachel ID
            model_id="eleven_multilingual_v2",
            output_format="mp3_44100_128"
        )
        
        output_file = "response_eleven.mp3"
        
        # Stream'i dosyaya yaz
        with open(output_file, "wb") as f:
            for chunk in audio_stream:
                if chunk:
                    f.write(chunk)
        
        play_audio(output_file)
        
    except Exception as e:
        print(f"❌ ElevenLabs Hatası: {e}")
        print("💡 İpucu: API Key yanlış olabilir veya kota bitmiş olabilir.")

def native_model_flow():
    audio_file = "native_input.wav"
    record_audio_smart(audio_file)

    print("📤 Ses Gemini'ye gönderiliyor...")
    try:
        myfile = genai.upload_file(audio_file)
        # Model ismini listedeki ile uyumlu hale getirdik
        model = genai.GenerativeModel("gemini-flash-latest")

        print("🧠 Gemini düşünüyor...")
        result = model.generate_content(
            [myfile, "Sen samimi, dert ortağı bir arkadaşsın. Doğal, kısa ve konuşma dilinde Türkçe cevap ver."],
        )
        
        ai_text = result.text
        print(f"🤖 Gemini: {ai_text}")
        
        if ai_text:
            speak_elevenlabs(ai_text)
            
    except Exception as e:
        print(f"❌ Gemini Hatası: {e}")

if __name__ == "__main__":
    native_model_flow()