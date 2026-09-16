"""Grounded chat responses backed by the Risk Map location-risk pipeline."""
import re
import requests
from typing import Any, Dict, List, Optional
from backend.config import GEMINI_API_KEY
from backend.database.database import SessionLocal
from backend.database.models import HazardZoneModel
from backend.routers.ml_model import compute_location_risk, LocationRiskRequest

SUPPORTED_CHATBOT_LANGUAGES = {"en", "hi", "as", "bn", "brx", "ks", "mni", "lus", "ne"}
CHATBOT_LANGUAGE_NAMES = {
    "en": "English",
    "hi": "Hindi",
    "as": "Assamese",
    "bn": "Bengali",
    "brx": "Bodo",
    "ks": "Khasi",
    "mni": "Manipuri (Meitei)",
    "lus": "Mizo",
    "ne": "Nepali",
}


def normalize_chatbot_language(language: Optional[str]) -> str:
    language_code = (language or "en").strip().lower()
    return language_code if language_code in SUPPORTED_CHATBOT_LANGUAGES else "en"

FAQ_DATABASE = [
    {
        "key": "current_risk",
        "keywords": ["current risk", "risk information", "current status"],
        "answer": "Current location-specific risk is available from the TerraGuard Risk Map. Choose a monitored region or ask about a named place to receive the shared location-risk evaluation.",
        "action": {"type": "NAVIGATE", "module": "risk-map"},
    },
    {
        "key": "emergency",
        "keywords": ["sos", "emergency", "help", "call", "ndma", "1078", "rescue"],
        "answer": "Emergency & Safety:\nTerraGuard is a decision-support and information system, not an official emergency dispatcher.\n\n- Call NDMA at 1078 or 1077.\n- Move to designated high ground if you observe slope movement, sudden water turbidity, or deep ground cracks.\n- Follow official SDMA, district administration, rescue, and evacuation instructions for actual emergency response.",
        "action": {"type": "NAVIGATE", "module": "emergency-sos"},
    },
    {
        "key": "map",
        "keywords": ["map", "risk map", "gis", "spatial", "visualize"],
        "answer": "The TerraGuard Risk Map shows the live spatial risk view for monitored locations.",
        "action": {"type": "NAVIGATE", "module": "risk-map"},
    },
    {
        "key": "score",
        "keywords": ["score", "meaning", "ml score", "calculated", "formula", "how does terraguard work"],
        "answer": "TerraGuard evaluates slope, elevation, soil, rainfall, and seismic context through its existing ML location-risk pipeline. Location answers use the same 0-100 score shown on the Risk Map.",
        "action": {"type": "NAVIGATE", "module": "ml-pipeline"},
    },
    {
        "key": "safety",
        "keywords": ["safety", "do during", "what to do", "landslide warning", "precautions"],
        "answer": "Landslide safety:\n1. Monitor TerraGuard alerts and identify evacuation routes.\n2. Evacuate away from debris paths when you hear rumbling or see ground cracks; never cross flooded gullies.\n3. Avoid slide areas afterward because secondary slides may occur.\n\nTerraGuard is decision support. Follow official emergency authorities for response instructions.",
        "action": {"type": "NAVIGATE", "module": "crowdsource"},
    },
    {
        "key": "earthquakes",
        "keywords": ["earthquake", "earthquakes", "seismic", "भूकंप", "ভূমিকম্প"],
        "answer": "Opening the Earthquake Monitor for the selected TerraGuard location.",
        "action": {"type": "NAVIGATE", "module": "earthquake-monitor"},
    },
    {
        "key": "weather",
        "keywords": ["weather", "rainfall forecast", "मौसम", "बारिश", "বতৰ", "আবহাওয়া"],
        "answer": "Opening the TerraGuard dashboard with the current weather and telemetry view.",
        "action": {"type": "NAVIGATE", "module": "dashboard"},
    },
    {
        "key": "hills",
        "keywords": ["show hills", "open hills", "go to hills", "hills in", "mountains in", "show mountain regions", "hill regions", "पहाड़", "पাহাড়"],
        "answer": "Opening Hills and Mountain Regions.",
        "action": {"type": "NAVIGATE", "module": "hills-regions"},
    },
    {
        "key": "regions",
        "keywords": ["open regions", "show regions", "go to regions", "regions and places", "region list"],
        "answer": "Opening Hills and Mountain Regions.",
        "action": {"type": "NAVIGATE", "module": "hills-regions"},
    },
    {
        "key": "alerts",
        "keywords": ["open alerts", "show alerts", "active alerts", "चेतावनी", "সতর্কতা"],
        "answer": "Opening active TerraGuard hazard alerts.",
        "action": {"type": "NAVIGATE", "module": "alerts"},
    },
    {
        "key": "report",
        "keywords": ["report a hazard", "report hazard", "hazard report", "खतरा रिपोर्ट", "বিপদ রিপোর্ট"],
        "answer": "Opening the TerraGuard hazard reporting tools.",
        "action": {"type": "NAVIGATE", "module": "crowdsource-cv-verification"},
    },
    {
        "key": "home",
        "keywords": ["go home", "open home", "मुख्य पृष्ठ", "घर जाएं", "হোম"],
        "answer": "Returning to the TerraGuard home screen.",
        "action": {"type": "NAVIGATE", "module": "home"},
    },
]

FAQ_TRANSLATIONS = {
    "en": {
        "current_risk": FAQ_DATABASE[0]["answer"],
        "emergency": FAQ_DATABASE[1]["answer"],
        "map": FAQ_DATABASE[2]["answer"],
        "score": FAQ_DATABASE[3]["answer"],
        "safety": FAQ_DATABASE[4]["answer"],
        "earthquakes": FAQ_DATABASE[5]["answer"],
        "weather": FAQ_DATABASE[6]["answer"],
        "hills": FAQ_DATABASE[7]["answer"],
        "regions": FAQ_DATABASE[8]["answer"],
        "alerts": FAQ_DATABASE[9]["answer"],
        "report": FAQ_DATABASE[10]["answer"],
        "home": FAQ_DATABASE[11]["answer"],
    },
    "hi": {
        "current_risk": "वर्तमान स्थान-विशिष्ट जोखिम TerraGuard Risk Map पर उपलब्ध है। साझा स्थान-जोखिम मूल्यांकन पाने के लिए किसी निगरानी किए गए क्षेत्र या स्थान का नाम पूछें।",
        "emergency": "आपातकाल और सुरक्षा:\nTerraGuard निर्णय-सहायक और सूचना प्रणाली है, आधिकारिक आपातकालीन डिस्पैचर नहीं।\n\n- NDMA को 1078 या 1077 पर कॉल करें।\n- ढलान की गति, पानी में अचानक गंदलापन या गहरी जमीन की दरार दिखे तो निर्धारित ऊंचे स्थान पर जाएं।\n- वास्तविक आपातकाल में SDMA, जिला प्रशासन, बचाव और निकासी निर्देशों का पालन करें।",
        "map": "TerraGuard Risk Map निगरानी किए गए स्थानों का लाइव स्थानिक जोखिम दृश्य दिखाता है।",
        "score": "TerraGuard अपनी मौजूदा ML स्थान-जोखिम पाइपलाइन से ढलान, ऊंचाई, मिट्टी, वर्षा और भूकंपीय स्थिति का मूल्यांकन करता है। स्थान संबंधी उत्तर Risk Map पर दिखने वाले 0-100 स्कोर का उपयोग करते हैं।",
        "safety": "भूस्खलन सुरक्षा:\n1. TerraGuard चेतावनियों की निगरानी करें और निकासी मार्ग पहचानें।\n2. गर्जना या जमीन की दरार दिखने पर मलबे के मार्ग से दूर जाएं; बाढ़ वाली नालियों को कभी पार न करें।\n3. भूस्खलन के बाद क्षेत्र से दूर रहें क्योंकि द्वितीयक भूस्खलन हो सकते हैं।\n\nTerraGuard निर्णय-सहायक है। प्रतिक्रिया के लिए आधिकारिक आपातकालीन अधिकारियों के निर्देशों का पालन करें।",
        "earthquakes": "चयनित TerraGuard स्थान के लिए भूकंप मॉनिटर खोला जा रहा है।",
        "weather": "वर्तमान मौसम और टेलीमेट्री देखने के लिए TerraGuard डैशबोर्ड खोला जा रहा है।",
        "hills": "पहाड़ी एवं पर्वतीय क्षेत्र खोले जा रहे हैं।",
        "regions": "क्षेत्र और स्थानों की सूची खोली जा रही है।",
        "alerts": "सक्रिय TerraGuard खतरा चेतावनियां खोली जा रही हैं।",
        "report": "TerraGuard खतरा रिपोर्टिंग उपकरण खोले जा रहे हैं।",
        "home": "TerraGuard मुख्य पृष्ठ पर लौट रहे हैं।",
    },
    "as": {
        "current_risk": "বৰ্তমান স্থান-নিৰ্দিষ্ট বিপদ TerraGuard Risk Map-ত উপলব্ধ। স্থান-ঝুঁকি মূল্যায়ন পাবলৈ কোনো নিৰীক্ষণ কৰা অঞ্চল বা ঠাইৰ নাম সোধক।",
        "emergency": "জৰুৰীকালীন আৰু সুৰক্ষা:\nTerraGuard সিদ্ধান্ত সহায়ক, চৰকাৰী জৰুৰীকালীন ডিচপেচাৰ নহয়।\n\n- NDMA-লৈ 1078 বা 1077 নম্বৰত ফোন কৰক।\n- ঢালৰ গতি, পানীৰ হঠাৎ ঘোলা হোৱা বা গভীৰ মাটিৰ ফাট দেখিলে নিৰ্ধাৰিত ওখ ঠাইলৈ যাওক।\n- SDMA, জিলা প্ৰশাসন আৰু উদ্ধাৰ কৰ্তৃপক্ষৰ নিৰ্দেশ মানি চলক।",
        "map": "TerraGuard Risk Map-এ নিৰীক্ষণ কৰা ঠাইসমূহৰ লাইভ স্থানিক বিপদৰ দৃশ্য দেখুৱায়।",
        "score": "TerraGuard-এ ঢাল, উচ্চতা, মাটি, বৰষুণ আৰু ভূকম্পনীয় পৰিস্থিতি ML স্থান-ঝুঁকি পাইপলাইনৰ জৰিয়তে মূল্যায়ন কৰে। স্থানৰ উত্তৰত Risk Map-ৰ 0-100 স্কোৰ ব্যৱহাৰ কৰা হয়।",
        "safety": "ভূমিস্খলন সুৰক্ষা:\n1. TerraGuard সতৰ্কবাণী নিৰীক্ষণ কৰক আৰু খালী কৰাৰ পথ চিনাক্ত কৰক।\n2. গৰ্জন বা মাটিৰ ফাট দেখিলে ধ্বংসাৱশেষৰ পথৰ পৰা আঁতৰি যাওক; বানপানী হোৱা নলা পাৰ নহ'ব।\n3. ভূমিস্খলনৰ পিছত ঠাইটো এৰাই চলক, কাৰণ পুনৰ ভূমিস্খলন হ'ব পাৰে।",
            "earthquakes": "নিৰ্বাচিত TerraGuard ঠাইৰ বাবে ভূমিকম্প মনিটৰ খোলা হৈছে।",
            "weather": "বৰ্তমান বতৰ আৰু টেলিমেট্ৰি চাবলৈ TerraGuard ডেশ্বব'ৰ্ড খোলা হৈছে।",
            "hills": "পাহাৰ আৰু পৰ্বত অঞ্চল খোলা হৈছে।",
            "regions": "অঞ্চল আৰু ঠাইসমূহৰ তালিকা খোলা হৈছে।",
            "alerts": "সক্ৰিয় TerraGuard বিপদৰ সতৰ্কবাণী খোলা হৈছে।",
            "report": "TerraGuard বিপদ প্ৰতিবেদনৰ সঁজুলি খোলা হৈছে।",
            "home": "TerraGuard মূল পৃষ্ঠালৈ উভতি যোৱা হৈছে।",
    },
    "bn": {
        "current_risk": "বর্তমান স্থান-নির্দিষ্ট ঝুঁকি TerraGuard Risk Map-এ পাওয়া যায়। স্থানীয় ঝুঁকি মূল্যায়নের জন্য কোনো পর্যবেক্ষিত অঞ্চল বা স্থানের নাম জিজ্ঞাসা করুন।",
        "emergency": "জরুরি অবস্থা ও নিরাপত্তা:\nTerraGuard সিদ্ধান্ত সহায়ক, সরকারি জরুরি প্রেরণ ব্যবস্থা নয়।\n\n- NDMA-তে 1078 বা 1077 নম্বরে কল করুন।\n- ঢালের নড়াচড়া, পানির হঠাৎ ঘোলাভাব বা গভীর মাটির ফাটল দেখলে নির্ধারিত উঁচু স্থানে যান।\n- SDMA, জেলা প্রশাসন এবং উদ্ধার কর্তৃপক্ষের নির্দেশ অনুসরণ করুন।",
        "map": "TerraGuard Risk Map পর্যবেক্ষিত স্থানগুলোর লাইভ স্থানিক ঝুঁকি দেখায়।",
        "score": "TerraGuard তার ML স্থানীয় ঝুঁকি পাইপলাইনের মাধ্যমে ঢাল, উচ্চতা, মাটি, বৃষ্টিপাত ও ভূমিকম্পের প্রেক্ষাপট মূল্যায়ন করে। স্থানীয় উত্তরে Risk Map-এর 0-100 স্কোর ব্যবহার করা হয়।",
        "safety": "ভূমিধস নিরাপত্তা:\n1. TerraGuard সতর্কতা দেখুন এবং সরিয়ে নেওয়ার পথ চিহ্নিত করুন।\n2. গর্জন বা মাটির ফাটল দেখলে ধ্বংসাবশেষের পথ থেকে দূরে যান; প্লাবিত নালা পার হবেন না।\n3. ভূমিধসের পরে এলাকা এড়িয়ে চলুন, কারণ দ্বিতীয় ভূমিধস হতে পারে।",
        "earthquakes": "নির্বাচিত TerraGuard স্থানের জন্য ভূমিকম্প মনিটর খোলা হচ্ছে।",
        "weather": "বর্তমান আবহাওয়া ও টেলিমেট্রি দেখতে TerraGuard ড্যাশবোর্ড খোলা হচ্ছে।",
        "hills": "পাহাড় ও পর্বত অঞ্চল খোলা হচ্ছে।",
        "regions": "অঞ্চল ও স্থানগুলোর তালিকা খোলা হচ্ছে।",
        "alerts": "সক্রিয় TerraGuard ঝুঁকি সতর্কতা খোলা হচ্ছে।",
        "report": "TerraGuard ঝুঁকি রিপোর্টিং সরঞ্জাম খোলা হচ্ছে।",
        "home": "TerraGuard হোম স্ক্রিনে ফিরে যাওয়া হচ্ছে।",
    },
    "brx": {
        "current_risk": "दानाय जायगानि जोखोमखौ TerraGuard Risk Map आव मोननो हायो।",
        "emergency": "इमरजेन्सी आरो रैखा:\nTerraGuard निर्णय-सहाय होयो, सरकारी इमरजेन्सी डिस्पेचार नङा। NDMA 1078 एबा 1077 आव कल खालाम आरो SDMA/NDMA नि फोरमान मान।",
        "map": "TerraGuard Risk Map आ नायगिरि जायगानि लाइव स्थानिक जोखोम दिहुनो।",
        "score": "TerraGuard आ ढाल, गोजौथाइ, हाम, अखा आरो भूकम्पनि बिसाय ML pipeline जों फोसावो।",
        "safety": "लैंडस्लाइड रैखा:\nमाटिर फाटल, गोरायनि आवाज एबा अखा जाबायब्ला जोखोम जायगाबाट नाङै थां। सरकारी फोरमान मान।",
            "earthquakes": "बासिखनाय TerraGuard जायगानि थाखाय भूकम्प मनिटर खेवबाय।",
            "weather": "दानाय मौसम आरो टेलिमेट्री नायनो TerraGuard डेशबोर्ड खेवबाय।",
            "hills": "डोंगर आरो पहार जायगा खेवबाय।",
            "regions": "जायगा आरो थानि लिस्ट खेवबाय।",
            "alerts": "TerraGuard नि दंनाय जोखोम सोंदोब खेवबाय।",
            "report": "TerraGuard जोखोम रिपोर्ट खालामनाय टुल खेवबाय।",
            "home": "TerraGuard होम स्क्रिनआव फिन थांबाय।",
    },
    "ks": {
        "current_risk": "Ka jingma jong ka jaka mynta lah ban ioh na TerraGuard Risk Map. Kylli ia ka kyrteng jong ka jaka ba peitngor ban ioh ia ka jingbishar jingma.",
        "emergency": "Emergency bad jingshngain:\nTerraGuard ka long ka jingiarap ban shim rai, ym dei ka official emergency dispatcher. Khot NDMA ha 1078 ne 1077 bad bud ia ki jingbthah jong ki bor shnong.",
        "map": "TerraGuard Risk Map ka pyni ia ka live spatial risk jong ki jaka ba peitngor.",
        "score": "TerraGuard ka bishar ia ka slope, elevation, soil, rainfall bad seismic context lyngba ka ML location-risk pipeline.",
        "safety": "Jingshngain na landslide:\nPeit ia ki jingma, ithuh ia ki lynti phet, bad jngai na ki lynti debris. Bud ia ki jingbthah jong ki bor sorkar.",
            "earthquakes": "Pynmih ia ka Earthquake Monitor na ka bynta ka jaka TerraGuard ba la jied.",
            "weather": "Pynmih ia ka TerraGuard dashboard ban peit ia ka weather bad telemetry mynta.",
            "hills": "Pynmih ia ki hmun lum bad lumbah.",
            "regions": "Pynmih ia ka thup ki jaka bad ki thaiñ.",
            "alerts": "Pynmih ia ki jingma ba dang treikam jong TerraGuard.",
            "report": "Pynmih ia ki tiar ban report jingma ha TerraGuard.",
            "home": "Kthang sha ka TerraGuard home screen.",
    },
    "mni": {
        "current_risk": "Houjik-gi location-specific risk TerraGuard Risk Map-ta phangjari. Monitored place-gi ming soksin aduga shared risk evaluation phang-u.",
        "emergency": "Emergency amasung safety:\nTerraGuard asi decision-support amadi official emergency dispatcher nattre. NDMA-da 1078 nattraga 1077-da call tou amasung local authority-gi direction yeng-u.",
        "map": "TerraGuard Risk Map-na monitored location-sing-gi live spatial risk yenghanbi.",
        "score": "TerraGuard-na slope, elevation, soil, rainfall amasung seismic context ML location-risk pipeline-da evaluate tou-i.",
        "safety": "Landslide safety:\nAlert-sing yeng-u, evacuation route sing thij-u, amadi debris path-singdagi yaoganu. Official authority-gi direction yeng-u.",
        "earthquakes": "Selected TerraGuard location-gi earthquake monitor hangjaragani.",
        "weather": "Current weather amasung telemetry yengnanaba TerraGuard dashboard hangjaragani.",
        "hills": "Hills amasung mountain regions hangjaragani.",
        "regions": "Regions amasung places-gi list hangjaragani.",
        "alerts": "TerraGuard active hazard alerts hangjaragani.",
        "report": "TerraGuard hazard reporting tools hangjaragani.",
        "home": "TerraGuard home screen-da amuk chatlamgani.",
    },
    "lus": {
        "current_risk": "TerraGuard Risk Map-ah hmunhma risk chu awm mek. Hmun hming zawt rawh chuan location-risk evaluation i dawng ang.",
        "emergency": "Emergency leh himna:\nTerraGuard hi decision-support a ni, official emergency dispatcher a ni lo. NDMA 1078 emaw 1077 emaw kawk rawh leh sorkar thuchah zawm rawh.",
        "map": "TerraGuard Risk Map chuan hmunte risk live spatial a lantir.",
        "score": "TerraGuard chuan slope, elevation, soil, ru leh earthquake context chu ML location-risk pipeline hmangin a zirchiang.",
        "safety": "Landslide himna:\nAlert te en rawh, evacuation route te hre rawh, debris path atangin inhla rawh. Official authority thuchah zawm rawh.",
        "earthquakes": "TerraGuard earthquake monitor chu hmun thlan atan kan hawn mek.",
        "weather": "Tunah weather leh telemetry en turin TerraGuard dashboard kan hawn mek.",
        "hills": "Tlang leh tlangpui hmunte kan hawn mek.",
        "regions": "Region leh hmunte list kan hawn mek.",
        "alerts": "TerraGuard hlauhawm alert te kan hawn mek.",
        "report": "TerraGuard hlauhawm report na tur te kan hawn mek.",
        "home": "TerraGuard home screen-ah kan kir mek.",
    },
    "ne": {
        "current_risk": "वर्तमान स्थान-विशिष्ट जोखिम TerraGuard Risk Map मा उपलब्ध छ। स्थान-जोखिम मूल्याङ्कनका लागि निगरानी गरिएको क्षेत्र वा स्थानको नाम सोध्नुहोस्।",
        "emergency": "आपतकाल र सुरक्षा:\nTerraGuard निर्णय सहयोगी हो, आधिकारिक आपतकालीन डिस्प्याच सेवा होइन। NDMA लाई 1078 वा 1077 मा फोन गर्नुहोस् र स्थानीय निकायका निर्देशन पालना गर्नुहोस्।",
        "map": "TerraGuard Risk Map ले निगरानी गरिएका स्थानको प्रत्यक्ष स्थानिक जोखिम देखाउँछ।",
        "score": "TerraGuard ले ML स्थान-जोखिम पाइपलाइनबाट भिरालोपन, उचाइ, माटो, वर्षा र भूकम्पीय अवस्थाको मूल्याङ्कन गर्छ। स्थानसम्बन्धी उत्तरमा Risk Map को 0-100 स्कोर प्रयोग हुन्छ।",
        "safety": "पहिरो सुरक्षा:\nTerraGuard चेतावनी हेर्नुहोस्, निकासी मार्ग पहिचान गर्नुहोस् र मलबेको बाटोबाट टाढा रहनुहोस्। आधिकारिक निकायका निर्देशन पालना गर्नुहोस्।",
        "earthquakes": "छानिएको TerraGuard स्थानका लागि भूकम्प मोनिटर खोलिँदैछ।",
        "weather": "हालको मौसम र टेलिमेट्री हेर्न TerraGuard ड्यासबोर्ड खोलिँदैछ।",
        "hills": "पहाडी तथा पर्वतीय क्षेत्र खोलिँदैछन्।",
        "regions": "क्षेत्र र स्थानहरूको सूची खोलिँदैछ।",
        "alerts": "सक्रिय TerraGuard खतरा चेतावनी खोलिँदैछन्।",
        "report": "TerraGuard खतरा रिपोर्टिङ उपकरण खोलिँदैछन्।",
        "home": "TerraGuard गृह स्क्रिनमा फर्किँदैछ।",
    },
}


def _number(value: Optional[str]) -> Optional[float]:
    match = re.search(r"-?\d+(?:\.\d+)?", (value or "").replace(",", ""))
    return float(match.group()) if match else None


def extract_location(message: str) -> Optional[Dict[str, Any]]:
    """Resolve user language against the database records used by the Risk Map."""
    db = SessionLocal()
    try:
        zones = db.query(HazardZoneModel).all()
    finally:
        db.close()

    text = message.lower()
    best, best_score = None, 0
    for zone in zones:
        name = zone.name.lower()
        state = (zone.state or "").lower()
        aliases = (
            [name, name.split("(")[0].strip(), state]
            + [token for token in re.split(r"[^a-z0-9]+", name) if len(token) >= 5]
        )
        score = max((len(alias) for alias in aliases if alias in text), default=0)
        if score > best_score:
            best, best_score = zone, score

    if not best:
        return None
    coords = re.findall(r"-?\d+(?:\.\d+)?", best.coords or "")
    if len(coords) < 2:
        return None
    return {
        "name": best.name,
        "lat": float(coords[0]),
        "lon": float(coords[1]),
        "state": best.state,
        "elevation": _number(best.elevation),
        "slope": _number(best.slopeGradient),
        "zone_id": best.id,
    }


def fetch_live_location_context(loc: Dict[str, Any]) -> Dict[str, Any]:
    request = LocationRiskRequest(
        name=loc["name"],
        location_type="region",
        latitude=loc["lat"],
        longitude=loc["lon"],
        state=loc["state"],
        elevation=loc["elevation"],
        slope=loc["slope"],
    )
    return {"location": loc, "risk_details": compute_location_risk(request)}


def generate_offline_response(message: str, loc_context: Optional[Dict[str, Any]] = None, language: str = "en") -> Dict[str, Any]:
    language = normalize_chatbot_language(language)

    localized = {
        "en": {
            "assessment": "TerraGuard Risk Map analysis",
            "overall": "Overall Landslide Risk Score",
            "base_ml": "Base ML probability",
            "rainfall_3d": "3-day rainfall",
            "slope": "Slope",
            "elevation": "Elevation",
            "coordinates": "Coordinates",
            "soil": "Soil",
            "seismic": "Seismic trigger score",
            "disclaimer": "TerraGuard is decision support, not an official warning or evacuation order. Follow SDMA/NDMA and local authority instructions.",
            "fallback": "TerraGuard Assistant can analyze real-time landslide risk, terrain, rainfall, and seismic activity.\n\nTry asking about Teesta Basin, a Risk Map location, rainfall, or emergency safety.",
        },
        "hi": {
            "assessment": "TerraGuard रिस्क मैप विश्लेषण",
            "overall": "कुल भूस्खलन जोखिम स्कोर",
            "base_ml": "आधार ML संभावना",
            "rainfall_3d": "3-दिवसीय वर्षा",
            "slope": "ढलान",
            "elevation": "ऊंचाई",
            "coordinates": "निर्देशांक",
            "soil": "मिट्टी",
            "seismic": "भूकंपीय ट्रिगर स्कोर",
            "disclaimer": "TerraGuard निर्णय सहायक है, आधिकारिक चेतावनी या निकासी आदेश नहीं है। SDMA/NDMA और स्थानीय प्राधिकरण के निर्देशों का पालन करें।",
            "fallback": "TerraGuard सहायक वास्तविक समय भूस्खलन जोखिम, भू-आकार, वर्षा और भूकंपीय गतिविधि का विश्लेषण कर सकता है।\n\nTeesta Basin, Risk Map स्थान, वर्षा या आपातकालीन सुरक्षा के बारे में पूछने का प्रयास करें।",
        },
        "as": {
            "assessment": "TerraGuard Risk Map বিশ্লেষণ",
            "overall": "সামগ্ৰিক ভূমিস্খলন ঝুঁকি স্কোৰ",
            "base_ml": "মূল ML সম্ভাৱনা",
            "rainfall_3d": "৩ দিনৰ বৰষুণ",
            "slope": "ঢাল",
            "elevation": "উচ্চতা",
            "coordinates": "স্থানাংক",
            "soil": "মাটি",
            "seismic": "ভূকম্পন ট্ৰিগাৰ স্কোৰ",
            "disclaimer": "TerraGuard সিদ্ধান্ত সহায়ক, চৰকাৰী সতৰ্কবাণী বা স্থানান্তৰৰ আদেশ নহয়। SDMA/NDMA আৰু স্থানীয় কৰ্তৃপক্ষৰ নিৰ্দেশনা মানি চলক।",
            "fallback": "TerraGuard সহায়কে ভূমিস্খলন ঝুঁকি, ভূ-প্ৰকৃতি, বৰষুণ আৰু ভূকম্পন সম্পৰ্কে বিশ্লেষণ কৰিব পাৰে।\n\nTeesta Basin, Risk Map, বৰষুণ বা জৰুৰী সুৰক্ষাৰ বিষয়ে সোধক।",
        },
        "bn": {
            "assessment": "TerraGuard Risk Map বিশ্লেষণ",
            "overall": "সামগ্রিক ভূমিধস ঝুঁকি স্কোর",
            "base_ml": "বেস ML সম্ভাবনা",
            "rainfall_3d": "৩ দিনের বৃষ্টিপাত",
            "slope": "ঢাল",
            "elevation": "উচ্চতা",
            "coordinates": "স্থানাঙ্ক",
            "soil": "মাটি",
            "seismic": "ভূমিকম্প ট্রিগার স্কোর",
            "disclaimer": "TerraGuard সিদ্ধান্ত সহায়ক, সরকারি সতর্কতা বা উচ্ছেদ আদেশ নয়। SDMA/NDMA এবং স্থানীয় কর্তৃপক্ষের নির্দেশনা অনুসরণ করুন।",
            "fallback": "TerraGuard সহায়ক ভূমিধস ঝুঁকি, ভূখণ্ড, বৃষ্টিপাত এবং ভূমিকম্পের কার্যকলাপ বিশ্লেষণ করতে পারে।\n\nTeesta Basin, Risk Map, বৃষ্টিপাত বা জরুরি নিরাপত্তা সম্পর্কে জিজ্ঞাসা করুন।",
        },
        "brx": {
            "assessment": "TerraGuard Risk Map बिजाब",
            "overall": "दिदोम लैंडस्लाइड जोखिम स्कोर",
            "base_ml": "बेस ML संभाव्यता",
            "rainfall_3d": "3 साननि अखा",
            "slope": "स्लोप",
            "elevation": "गोजौथाइ",
            "coordinates": "कोर्डिनेट",
            "soil": "हाम",
            "seismic": "भूकम्प ट्रिगार स्कोर",
            "disclaimer": "TerraGuard फिसायाव मदद होयो, सरकारी सोंदोब नङा। SDMA/NDMA आरो स्थानिय हुकुमनि उथान फाव।",
            "fallback": "TerraGuard सहायक लैंडस्लाइड जोखिम, जमीन, अखा आरो भूकम्पनि बिबुंथि होयो।\n\nTeesta Basin, Risk Map, अखा एबा इमरजेन्सी सुरक्षा सोमोन्दै सों।",
        },
        "ks": {
            "assessment": "TerraGuard Risk Map jaa'izah",
            "overall": "Kul landslide risk score",
            "base_ml": "Buniyadi ML imkaniyat",
            "rainfall_3d": "3 roza baarish",
            "slope": "Dhal",
            "elevation": "Bulandi",
            "coordinates": "Maqaami nishaan",
            "soil": "Matti",
            "seismic": "Zalzala trigger score",
            "disclaimer": "TerraGuard faisla-sazi madadgar chu, sarkaari khatre ya nikasi hukam na chu. SDMA/NDMA te maqami idaaran hinidayat maaniv۔",
            "fallback": "TerraGuard madadgar landslide risk, zameen, baarish te zalzale di sargarmi jaa'iz karith sakaan۔\n\nTeesta Basin, Risk Map, baarish ya emergency safety baare puchiv۔",
        },
        "mni": {
            "assessment": "TerraGuard Risk Map gi wayel",
            "overall": "Landslide risk score pumnamak",
            "base_ml": "Base ML probability",
            "rainfall_3d": "Numit ahum nungsit",
            "slope": "Lukhraba",
            "elevation": "Ahingba",
            "coordinates": "Coordinate",
            "soil": "Lei",
            "seismic": "Earthquake trigger score",
            "disclaimer": "TerraGuard asi decision-support amadi official warning nattre. SDMA/NDMA amasung local authority-gi direction yeng-u.",
            "fallback": "TerraGuard assistant-na landslide risk, terrain, nungsit amadi earthquake activity analyze touba ngammi.\n\nTeesta Basin, Risk Map, nungsit nattraga emergency safety gi maramda hang-u.",
        },
        "lus": {
            "assessment": "TerraGuard Risk Map chhui",
            "overall": "Landslide hlauhawm score pumhlum",
            "base_ml": "ML probability bulpui",
            "rainfall_3d": "Ni 3 chhunga ru",
            "slope": "Tlangram",
            "elevation": "Sang zawng",
            "coordinates": "Coordinates",
            "soil": "Leilet",
            "seismic": "Earthquake trigger score",
            "disclaimer": "TerraGuard hi thutlukna tan puihna a ni, official warning emaw evacuation order emaw a ni lo. SDMA/NDMA leh local authority thuchah zawm rawh.",
            "fallback": "TerraGuard assistant chuan landslide hlauhawm, terrain, ru leh earthquake activity a zirchiang thei.\n\nTeesta Basin, Risk Map, ru emaw emergency safety emaw zawt rawh.",
        },
        "ne": {
            "assessment": "TerraGuard Risk Map विश्लेषण",
            "overall": "समग्र पहिरो जोखिम स्कोर",
            "base_ml": "आधार ML सम्भावना",
            "rainfall_3d": "३-दिने वर्षा",
            "slope": "भिरालोपन",
            "elevation": "उचाइ",
            "coordinates": "निर्देशाङ्क",
            "soil": "माटो",
            "seismic": "भूकम्प ट्रिगर स्कोर",
            "disclaimer": "TerraGuard निर्णय सहयोगी हो, आधिकारिक चेतावनी वा निकासी आदेश होइन। SDMA/NDMA र स्थानीय निकायका निर्देशन पालना गर्नुहोस्।",
            "fallback": "TerraGuard सहायकले पहिरो जोखिम, भू-भाग, वर्षा र भूकम्पीय गतिविधिको विश्लेषण गर्न सक्छ।\n\nTeesta Basin, Risk Map, वर्षा वा आपतकालीन सुरक्षाबारे सोध्नुहोस्।",
        },
    }

    t = localized.get(language, localized["en"])

    if loc_context:
        details = loc_context["risk_details"]
        loc_info = loc_context["location"]
        inputs = details.get("inputs", {})
        rainfall = inputs.get("rainfall", {})
        seismic = inputs.get("seismic", {})
        soil = inputs.get("soil_details", {})
        location = details.get("location", {})

        def display(value: Any, suffix: str = "") -> str:
            return "Unavailable" if value is None else f"{value}{suffix}"

        base_probability = details.get("base_ml_probability")
        base_probability_text = (
            "Unavailable" if base_probability is None else f"{float(base_probability) * 100:.1f}%"
        )
        coordinates = (
            f"{location.get('latitude')}, {location.get('longitude')}"
            if location.get("latitude") is not None and location.get("longitude") is not None
            else "Unavailable"
        )
        return {
            "reply": (
                f"{t['assessment']}: **{loc_info['name']}**\n\n"
                f"• **{t['overall']}:** **{display(details.get('final_risk_score'), ' / 100')}** ({details.get('risk_level', 'Unavailable')})\n"
                f"• **{t['base_ml']}:** {base_probability_text}\n"
                f"• **{t['rainfall_3d']}:** {display(rainfall.get('rainfall_3d_mm'), ' mm')}\n"
                f"• **{t['slope']}:** {display(inputs.get('slope_deg'), '°')}\n"
                f"• **{t['elevation']}:** {display(inputs.get('elevation_m'), ' m')}\n"
                f"• **{t['coordinates']}:** {coordinates}\n"
                f"• **{t['soil']}:** {soil.get('soil_name') or 'Unavailable'}\n"
                f"• **{t['seismic']}:** {display(seismic.get('seismic_trigger_score'))}\n\n"
                f"{t['disclaimer']}"
            ),
            "source": "terraguard-live-ml",
            "action": {
                "type": "SELECT_REGION",
                "module": "risk-map",
                "zone_id": loc_info["zone_id"],
                "coordinates": {"lat": loc_info["lat"], "lon": loc_info["lon"]},
            },
        }

    msg_lower = message.lower()
    for faq in FAQ_DATABASE:
        if any(keyword in msg_lower for keyword in faq["keywords"]):
            answer = FAQ_TRANSLATIONS[language].get(faq["key"], faq["answer"])
            return {"reply": answer, "source": "terraguard-rule-engine", "action": faq.get("action")}
    return {
        "reply": t["fallback"],
        "source": "terraguard-rule-engine",
    }


def generate_gemini_response(
    message: str, history: List[Dict[str, str]], loc_context: Optional[Dict[str, Any]], language: str = "en"
) -> Optional[Dict[str, Any]]:
    if not GEMINI_API_KEY:
        return None
    try:
        lang_label = normalize_chatbot_language(language)
        language_name = CHATBOT_LANGUAGE_NAMES[lang_label]
        system_instruction = (
            "You are TerraGuard Assistant. "
            f"Respond in the selected language. Selected language: {language_name}. "
            f"Use natural, fluent {language_name}. Do not switch to English unless the user explicitly requests English. "
            "Use only general geotechnical and safety knowledge. "
            "Never invent numerical risk, rainfall, soil, seismic, or warning data. "
            "Preserve the underlying TerraGuard data and everything factual."
        )
        recent_history = history[-12:]
        history_text = "\n".join(
            f"{turn.get('role', 'user')}: {turn.get('content', '')}"
            for turn in recent_history
        )
        prompt_content = (
            f"{system_instruction}\n"
            f"Recent conversation:\n{history_text or '(none)'}\n"
            f"User Question: {message}"
        )
        url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"
        response = requests.post(
            url,
            json={"contents": [{"parts": [{"text": prompt_content}]}]},
            headers={"x-goog-api-key": GEMINI_API_KEY},
            timeout=8,
        )
        if response.status_code == 200:
            data = response.json()
            return {
                "reply": data["candidates"][0]["content"]["parts"][0]["text"],
                "source": "gemini-1.5-flash",
            }
    except Exception as error:
        print(f"Gemini API fallback to offline rule engine: {error}")
    return None


def process_chat_message(message: str, history: Optional[List[Dict[str, str]]] = None, language: str = "en") -> Dict[str, Any]:
    language = normalize_chatbot_language(language)
    navigation_keys = {"earthquakes", "weather", "hills", "regions", "alerts", "report", "home"}
    navigation_keywords = {
        keyword
        for faq in FAQ_DATABASE
        if faq["key"] in navigation_keys
        for keyword in faq["keywords"]
    }
    loc = None if any(keyword in message.lower() for keyword in navigation_keywords) else extract_location(message)
    loc_context = fetch_live_location_context(loc) if loc else None
    if GEMINI_API_KEY and not loc_context:
        gemini_response = generate_gemini_response(message, history or [], None, language=language)
        if gemini_response:
            return gemini_response
    return generate_offline_response(message, loc_context, language=language)
