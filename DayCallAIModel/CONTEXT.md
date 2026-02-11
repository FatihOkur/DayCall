AI Voice Journal - Project Context & Instructions
1. Proje Özeti
Bu proje, kullanıcının gününü dinleyen, dertleşen ve "Her" filmindeki gibi doğal bir etkileşim sunan bir Sesli Günlük (Voice Journal) asistanıdır. Amaç, sadece komut alan bir asistan değil, duygusal zekası olan proaktif bir arkadaş yaratmaktır.

Şu an proje Python (v3.12) üzerinde çalışan iki farklı prototip mimariye sahiptir.

2. Mevcut Mimari ve Yöntemler
Projede iki farklı yaklaşım denenmiş ve kodlanmıştır:

A. Native Input Yöntemi (native_input.py)
Mantık: Ses dosyası (.wav) kaydedilir ve doğrudan multimodal LLM'e (Gemini) gönderilir.

Avantajı: Model, kullanıcının ses tonunu, vurgusunu ve duygusunu analiz edebilir (Audio-to-Text-to-Audio değil, Audio-to-Response).

Akış: Mikrofon (PyAudio) -> WAV Dosyası -> Gemini 1.5 Flash (Audio Upload) -> Metin Cevap -> ElevenLabs (TTS) -> Hoparlör (Pygame)

B. Pipeline Yöntemi (pipeline.py)
Mantık: Klasik STT (Speech-to-Text) -> LLM -> TTS zinciri.

Avantajı: Daha hızlı, daha az veri tüketir ve daha garantilidir.

Akış: Mikrofon (PyAudio) -> Google Speech Recognition (Free STT) -> Metin -> Gemini 1.5 Flash (Text Prompt) -> Metin Cevap -> ElevenLabs (TTS) -> Hoparlör (Pygame)

3. Kullanılan Teknoloji Yığını (Tech Stack)
Dil: Python 3.12 (3.14 uyumsuzluk çıkardığı için 3.12 kullanılıyor)

LLM (Beyin): Google Gemini 1.5 Flash (veya gemini-flash-latest)

Kütüphane: google-generativeai

TTS (Seslendirme): ElevenLabs (v1.0+ Client yapısı)

Kütüphane: elevenlabs

Ses Modeli: eleven_multilingual_v2

Ses ID: Rachel (21m00Tcm4TlvDq8ikWAM)

STT (Sadece Pipeline için): Google Web Speech API

Kütüphane: SpeechRecognition

Ses Kayıt: pyaudio + wave

Sessizlik Algılama: audioop (RMS hesaplama için)

Ses Oynatma: pygame (FFmpeg bağımlılığından kaçınmak için pydub yerine seçildi)

Env Yönetimi: python-dotenv

4. Kritik Algoritmalar ve Kod Mantığı
A. Dinamik Sessizlik Algılama (Smart Recording)
Kullanıcının bir butona basmasını beklemek yerine, konuşma bittiğinde kaydı otomatik durduran bir algoritma geliştirildi.

Kalibrasyon: Kod başladığında 1 saniye ortam dinlenir (get_ambient_noise).

Eşik (Threshold): Ortam gürültüsünün ortalamasına +500 eklenerek dinamik bir eşik belirlenir.

Kayıt Döngüsü:

Ses eşiği aşılırsa speaking_started = True.

Konuşma başladıktan sonra 1.5 saniye (SILENCE_LIMIT) boyunca eşik altı sessizlik olursa kayıt otomatik biter.

Sonsuz döngüyü engellemek için MAX_DURATION = 30 saniye sınırı vardır.

B. ElevenLabs v1.0+ Entegrasyonu
Eski generate fonksiyonu yerine yeni SDK yapısı kullanılmaktadır:

Python
client.text_to_speech.convert(
    text=text,
    voice_id="ID",
    model_id="eleven_multilingual_v2",
    output_format="mp3_44100_128"
)
Ses stream edildiği için manuel olarak dosyaya (wb modunda) yazılmaktadır.

5. Kurulum ve Çalıştırma
Gerekli Kütüphaneler
Bash
pip install elevenlabs python-dotenv pygame pyaudio speechrecognition google-generativeai
.env Dosyası Yapısı
Proje kök dizininde .env dosyası bulunmalıdır:

Kod snippet'i
GOOGLE_API_KEY=AIzaSy...
ELEVENLABS_API_KEY=sk_...
6. Bilinen Sorunlar ve Dikkat Edilecekler
FFmpeg: Windows üzerinde FFmpeg kurulumu sorunlu olduğu için pydub kütüphanesi projeden çıkarıldı, yerine pygame kullanılıyor.

Model İsimleri: Google Gemini model isimleri sık değişiyor. Şu an gemini-1.5-flash veya gemini-flash-latest stabil çalışıyor. 2.0 versiyonları henüz Free Tier'da çalışmıyor.

ElevenLabs Kotası: Ücretsiz planda karakter sınırı olduğu için testlerde kısa cevaplar isteniyor.
