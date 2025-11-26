import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from 'react-i18next';

interface Message {
  message: string;
  isUser: boolean;
}

interface ContextualSuggestionsProps {
  messages: Message[];
  onSuggestionClick: (suggestion: string) => void;
  className?: string;
}

const ContextualSuggestions = ({
  messages,
  onSuggestionClick,
  className,
}: ContextualSuggestionsProps) => {
  const { language } = useLanguage();
  const { t } = useTranslation(['common']);

  // Extract keywords from text
  const extractKeywords = (text: string, lang: string): string[] => {
    const lowerText = text.toLowerCase();
    const keywords: string[] = [];

    // Medical keywords by language
    const medicalKeywords: Record<string, string[]> = {
      th: [
        'ไข้',
        'ปวด',
        'เจ็บ',
        'หวัด',
        'ไอ',
        'จาม',
        'น้ำมูก',
        'คัดจมูก',
        'เจ็บคอ',
        'ปวดหัว',
        'เวียนหัว',
        'คลื่นไส้',
        'อาเจียน',
        'ท้องเสีย',
        'ท้องผูก',
        'อาหารไม่ย่อย',
        'นอนไม่หลับ',
        'อ่อนเพลีย',
        'เหนื่อย',
        'หายใจ',
        'หอบ',
        'หืด',
        'ภูมิแพ้',
        'ผื่น',
        'คัน',
        'แผล',
        'เลือด',
        'บวม',
        'อักเสบ',
        'ติดเชื้อ',
        'ยา',
        'รักษา',
        'ตรวจ',
        'วินิจฉัย',
        'อาการ',
        'โรค',
        'สุขภาพ',
      ],
      en: [
        'fever',
        'pain',
        'ache',
        'hurt',
        'cold',
        'cough',
        'sneeze',
        'runny nose',
        'sore throat',
        'headache',
        'dizzy',
        'nausea',
        'vomit',
        'diarrhea',
        'constipation',
        'indigestion',
        'insomnia',
        'tired',
        'fatigue',
        'breath',
        'asthma',
        'allergy',
        'rash',
        'itch',
        'wound',
        'bleed',
        'swell',
        'inflammation',
        'infection',
        'medicine',
        'treatment',
        'check',
        'diagnose',
        'symptom',
        'disease',
        'health',
      ],
      jp: [
        '熱',
        '痛み',
        '痛い',
        '風邪',
        '咳',
        'くしゃみ',
        '鼻水',
        '喉の痛み',
        '頭痛',
        'めまい',
        '吐き気',
        '嘔吐',
        '下痢',
        '便秘',
        '不眠',
        '疲れ',
        '息切れ',
        '喘息',
        'アレルギー',
        '発疹',
        'かゆみ',
        '傷',
        '出血',
        '腫れ',
        '炎症',
        '感染',
        '薬',
        '治療',
        '検査',
        '診断',
        '症状',
        '病気',
        '健康',
      ],
      id: [
        'demam',
        'sakit',
        'nyeri',
        'batuk',
        'pilek',
        'sakit kepala',
        'mual',
        'diare',
        'sembelit',
        'lelah',
        'sesak napas',
        'alergi',
        'ruam',
        'luka',
        'obat',
        'pengobatan',
        'gejala',
        'penyakit',
        'kesehatan',
      ],
      zh: [
        '发烧',
        '疼痛',
        '咳嗽',
        '感冒',
        '头痛',
        '头晕',
        '恶心',
        '腹泻',
        '便秘',
        '疲劳',
        '呼吸',
        '哮喘',
        '过敏',
        '皮疹',
        '伤口',
        '药物',
        '治疗',
        '检查',
        '症状',
        '疾病',
        '健康',
      ],
      ko: [
        '열',
        '통증',
        '기침',
        '감기',
        '두통',
        '어지러움',
        '메스꺼움',
        '설사',
        '변비',
        '피로',
        '호흡',
        '천식',
        '알레르기',
        '발진',
        '상처',
        '약물',
        '치료',
        '검사',
        '증상',
        '질병',
        '건강',
      ],
      vi: [
        'sốt',
        'đau',
        'ho',
        'cảm',
        'đau đầu',
        'chóng mặt',
        'buồn nôn',
        'tiêu chảy',
        'táo bón',
        'mệt mỏi',
        'thở',
        'hen suyễn',
        'dị ứng',
        'phát ban',
        'vết thương',
        'thuốc',
        'điều trị',
        'kiểm tra',
        'triệu chứng',
        'bệnh',
        'sức khỏe',
      ],
      es: [
        'fiebre',
        'dolor',
        'tos',
        'resfriado',
        'dolor de cabeza',
        'mareo',
        'náusea',
        'diarrea',
        'estreñimiento',
        'cansancio',
        'respiración',
        'asma',
        'alergia',
        'erupción',
        'herida',
        'medicina',
        'tratamiento',
        'examen',
        'síntoma',
        'enfermedad',
        'salud',
      ],
      fil: [
        'lagnat',
        'sakit',
        'ubo',
        'sipon',
        'sakit ng ulo',
        'pagkahilo',
        'pagduduwal',
        'pagtatae',
        'paninigas ng dumi',
        'pagod',
        'hininga',
        'hika',
        'alergi',
        'pantal',
        'sugat',
        'gamot',
        'paggamot',
        'pagsusuri',
        'sintomas',
        'sakit',
        'kalusugan',
      ],
      hi: [
        'बुखार',
        'दर्द',
        'खांसी',
        'सर्दी',
        'सिरदर्द',
        'चक्कर',
        'मतली',
        'दस्त',
        'कब्ज',
        'थकान',
        'सांस',
        'दमा',
        'एलर्जी',
        'दाने',
        'घाव',
        'दवा',
        'उपचार',
        'जांच',
        'लक्षण',
        'बीमारी',
        'स्वास्थ्य',
      ],
    };

    const keywordsList = medicalKeywords[lang] || medicalKeywords.en;
    keywordsList.forEach((keyword) => {
      if (lowerText.includes(keyword)) {
        keywords.push(keyword);
      }
    });

    return keywords;
  };

  // Generate dynamic suggestions based on context
  const generateDynamicSuggestions = (keywords: string[], lang: string): string[] => {
    const suggestions: string[] = [];

    // Question templates by language - more natural and contextual
    const templates: Record<string, string[]> = {
      th: [
        'เกี่ยวกับ{keyword} มีวิธีป้องกันอย่างไร',
        'วิธีดูแล{keyword}ที่บ้าน',
        'เมื่อไรควรไปพบแพทย์เกี่ยวกับ{keyword}',
        '{keyword}เกิดจากสาเหตุอะไร',
        'วิธีบรรเทา{keyword}เบื้องต้น',
        'มีวิธีรักษา{keyword}อย่างไร',
        'อาการ{keyword}นี้ร้ายแรงไหม',
        'ควรทำอย่างไรเมื่อมี{keyword}',
        'มีอาหารที่ช่วยเรื่อง{keyword}ไหม',
      ],
      en: [
        'How to prevent {keyword}',
        'Home care tips for {keyword}',
        'When to see a doctor about {keyword}',
        'What causes {keyword}',
        'Initial relief methods for {keyword}',
        'How to treat {keyword}',
        'Is {keyword} serious',
        'What to do when having {keyword}',
        'Foods that help with {keyword}',
      ],
      jp: [
        '{keyword}の予防方法は',
        '{keyword}の自宅ケア',
        '{keyword}について医師に相談すべき時',
        '{keyword}の原因は何ですか',
        '{keyword}の初期緩和方法',
        '{keyword}の治療方法',
        '{keyword}は深刻ですか',
        '{keyword}がある場合の対処法',
        '{keyword}に役立つ食品',
      ],
      id: [
        'Bagaimana mencegah {keyword}',
        'Tips perawatan di rumah untuk {keyword}',
        'Kapan harus ke dokter tentang {keyword}',
        'Apa penyebab {keyword}',
        'Cara meredakan {keyword} awal',
        'Bagaimana mengobati {keyword}',
      ],
      zh: [
        '如何预防{keyword}',
        '{keyword}的家庭护理技巧',
        '何时就{keyword}看医生',
        '{keyword}的原因是什么',
        '{keyword}的初步缓解方法',
        '如何治疗{keyword}',
      ],
      ko: [
        '{keyword} 예방 방법',
        '{keyword} 가정 관리 팁',
        '{keyword}에 대해 의사를 만나야 할 때',
        '{keyword}의 원인은 무엇인가요',
        '{keyword} 초기 완화 방법',
        '{keyword} 치료 방법',
      ],
      vi: [
        'Cách phòng ngừa {keyword}',
        'Mẹo chăm sóc tại nhà cho {keyword}',
        'Khi nào nên gặp bác sĩ về {keyword}',
        'Nguyên nhân gây ra {keyword}',
        'Phương pháp giảm đau ban đầu cho {keyword}',
        'Cách điều trị {keyword}',
      ],
      es: [
        'Cómo prevenir {keyword}',
        'Consejos de cuidado en el hogar para {keyword}',
        'Cuándo ver a un médico sobre {keyword}',
        'Qué causa {keyword}',
        'Métodos de alivio inicial para {keyword}',
        'Cómo tratar {keyword}',
      ],
      fil: [
        'Paano maiwasan ang {keyword}',
        'Mga tip sa pangangalaga sa bahay para sa {keyword}',
        'Kailan dapat magpatingin sa doktor tungkol sa {keyword}',
        'Ano ang sanhi ng {keyword}',
        'Mga paraan ng paunang lunas para sa {keyword}',
        'Paano gamutin ang {keyword}',
      ],
      hi: [
        '{keyword} को कैसे रोकें',
        '{keyword} के लिए घरेलू देखभाल युक्तियाँ',
        '{keyword} के बारे में डॉक्टर से कब मिलें',
        '{keyword} का कारण क्या है',
        '{keyword} के लिए प्रारंभिक राहत विधियाँ',
        '{keyword} का इलाज कैसे करें',
      ],
    };

    const langTemplates = templates[lang] || templates.en;

    // Use first keyword found to generate 3 related questions
    if (keywords.length > 0) {
      const mainKeyword = keywords[0];
      // Randomly select 3 different templates to avoid repetition
      const selectedTemplates = langTemplates.sort(() => Math.random() - 0.5).slice(0, 3);

      selectedTemplates.forEach((template) => {
        const question = template.replace('{keyword}', mainKeyword);
        if (!suggestions.includes(question)) {
          suggestions.push(question);
        }
      });
    }

    // Fill remaining slots with general follow-up questions
    if (suggestions.length < 3) {
      const generalQuestions: Record<string, string[]> = {
        th: ['ให้คำแนะนำเพิ่มเติมได้ไหม', 'มีวิธีป้องกันไหม', 'ควรทำอย่างไรต่อ'],
        en: ['Can you provide more details', 'How can I prevent this', 'What should I do next'],
        jp: ['詳細を教えてください', 'これを予防する方法は', '次に何をすべきですか'],
        id: [
          'Bisakah Anda memberikan detail lebih lanjut',
          'Bagaimana cara mencegah ini',
          'Apa yang harus saya lakukan selanjutnya',
        ],
        zh: ['您能提供更多详细信息吗', '如何预防这种情况', '接下来应该做什么'],
        ko: [
          '더 자세한 정보를 제공해 주실 수 있나요',
          '이것을 어떻게 예방할 수 있나요',
          '다음에 무엇을 해야 하나요',
        ],
        vi: [
          'Bạn có thể cung cấp thêm chi tiết không',
          'Làm thế nào để ngăn ngừa điều này',
          'Tôi nên làm gì tiếp theo',
        ],
        es: [
          '¿Puede proporcionar más detalles',
          '¿Cómo puedo prevenir esto',
          '¿Qué debo hacer a continuación',
        ],
        fil: [
          'Maaari mo bang magbigay ng karagdagang detalye',
          'Paano ko maiiwasan ito',
          'Ano ang dapat kong gawin susunod',
        ],
        hi: [
          'क्या आप अधिक विवरण प्रदान कर सकते हैं',
          'मैं इसे कैसे रोक सकता हूं',
          'मुझे आगे क्या करना चाहिए',
        ],
      };
      const general = generalQuestions[lang] || generalQuestions.en;
      general.slice(0, 3 - suggestions.length).forEach((q) => {
        if (!suggestions.includes(q)) {
          suggestions.push(q);
        }
      });
    }

    return suggestions.slice(0, 3);
  };

  // Analyze conversation context and generate smart suggestions
  const generateSuggestions = (): string[] => {
    if (messages.length === 0) {
      // Initial suggestions when no conversation
      const initialSuggestions: Record<string, string[]> = {
        th: [
          'อาการปวดหัวบ่อยๆ ควรทำอย่างไร',
          'วิธีดูแลสุขภาพในช่วงหน้าหนาว',
          'อาหารที่ช่วยเสริมภูมิคุ้มกัน',
        ],
        en: [
          'How to deal with frequent headaches',
          'Health tips for winter season',
          'Foods that boost immunity',
        ],
        jp: ['頻繁な頭痛の対処法', '冬の健康管理のコツ', '免疫力を高める食品'],
        id: [
          'Bagaimana mengatasi sakit kepala yang sering',
          'Tips kesehatan untuk musim dingin',
          'Makanan yang meningkatkan imunitas',
        ],
        zh: ['如何应对频繁头痛', '冬季健康小贴士', '增强免疫力的食物'],
        ko: ['빈번한 두통 대처 방법', '겨울철 건강 관리 팁', '면역력 향상 음식'],
        vi: [
          'Cách xử lý đau đầu thường xuyên',
          'Mẹo sức khỏe cho mùa đông',
          'Thực phẩm tăng cường miễn dịch',
        ],
        es: [
          'Cómo lidiar con dolores de cabeza frecuentes',
          'Consejos de salud para el invierno',
          'Alimentos que refuerzan la inmunidad',
        ],
        fil: [
          'Paano haharapin ang madalas na sakit ng ulo',
          'Mga tip sa kalusugan para sa taglamig',
          'Mga pagkaing nagpapalakas ng immunity',
        ],
        hi: [
          'बार-बार सिरदर्द से कैसे निपटें',
          'सर्दियों के लिए स्वास्थ्य युक्तियाँ',
          'प्रतिरक्षा बढ़ाने वाले खाद्य पदार्थ',
        ],
      };
      return initialSuggestions[language] || initialSuggestions.th;
    }

    // Get recent messages for context (last 6 messages)
    const recentMessages = messages.slice(-6);
    const allRecentText = recentMessages.map((m) => m.message).join(' ');

    // Extract keywords from conversation
    const keywords = extractKeywords(allRecentText, language);

    // If we found keywords, generate dynamic suggestions
    if (keywords.length > 0) {
      const dynamicSuggestions = generateDynamicSuggestions(keywords, language);
      if (dynamicSuggestions.length > 0) {
        return dynamicSuggestions;
      }
    }

    // Fallback: Use context-based suggestions
    const contextLower = allRecentText.toLowerCase();

    // Medical context-aware suggestions
    const contextualSuggestions: Record<string, string[]> = {
      // Fever related
      fever_th: [
        'ไข้ร่วมกับอาการอื่นๆ ที่ควรระวัง',
        'วิธีลดไข้ที่บ้านอย่างปลอดภัย',
        'เมื่อไรควรไปพบแพทย์',
      ],
      fever_en: [
        'Other symptoms to watch with fever',
        'Safe ways to reduce fever at home',
        'When should I see a doctor',
      ],
      fever_jp: [
        '発熱と一緒に注意すべき症状',
        '自宅で安全に熱を下げる方法',
        'いつ医師に相談すべきか',
      ],

      // Pain related
      pain_th: [
        'อาการปวดนี้เกิดจากสาเหตุอะไร',
        'วิธีบรรเทาอาการปวดเบื้องต้น',
        'ควรใช้ยาแก้ปวดชนิดไหน',
      ],
      pain_en: [
        'What causes this type of pain',
        'Initial pain relief methods',
        'Which pain medication should I use',
      ],
      pain_jp: ['この痛みの原因は何ですか', '初期の痛み緩和方法', 'どの鎮痛剤を使用すべきか'],

      // Cold/Flu related
      cold_th: [
        'แยกอาการหวัดธรรมดากับไข้หวัดใหญ่',
        'วิธีดูแลตัวเองเมื่อเป็นหวัด',
        'อาหารที่ช่วยให้หายเร็วขึ้น',
      ],
      cold_en: [
        'Difference between cold and flu',
        'Self-care tips for cold symptoms',
        'Foods that speed up recovery',
      ],
      cold_jp: ['風邪とインフルエンザの違い', '風邪の症状のセルフケア', '回復を早める食品'],

      // General health
      health_th: [
        'การตรวจสุขภาพประจำปีควรตรวจอะไรบ้าง',
        'วิธีเสริมสร้างสุขภาพที่ดี',
        'อาหารเสริมที่จำเป็นสำหรับวัยนี้',
      ],
      health_en: [
        'What should be included in annual checkup',
        'Ways to improve overall health',
        'Essential supplements for my age',
      ],
      health_jp: [
        '年次健康診断で何を検査すべきか',
        '全体的な健康を改善する方法',
        '年齢に必要なサプリメント',
      ],
    };

    // Detect context with expanded keywords
    const feverKeywords = [
      'ไข้',
      'fever',
      '発熱',
      'ตัวร้อน',
      'hot',
      '熱',
      'demam',
      'lagnat',
      'बुखार',
      'sốt',
      'fiebre',
    ];
    const painKeywords = [
      'ปวด',
      'เจ็บ',
      'pain',
      'ache',
      '痛',
      'hurt',
      'sakit',
      'nyeri',
      'दर्द',
      'đau',
      'dolor',
    ];
    const coldKeywords = [
      'หวัด',
      'ไอ',
      'cold',
      'cough',
      'flu',
      '風邪',
      '咳',
      'batuk',
      'sipon',
      'खांसी',
      'ho',
      'tos',
    ];
    const healthKeywords = [
      'สุขภาพ',
      'health',
      '健康',
      'wellness',
      'checkup',
      'kesehatan',
      '건강',
      'sức khỏe',
      'salud',
    ];

    if (feverKeywords.some((kw) => contextLower.includes(kw))) {
      return contextualSuggestions[`fever_${language}`] || contextualSuggestions.fever_th;
    }
    if (painKeywords.some((kw) => contextLower.includes(kw))) {
      return contextualSuggestions[`pain_${language}`] || contextualSuggestions.pain_th;
    }
    if (coldKeywords.some((kw) => contextLower.includes(kw))) {
      return contextualSuggestions[`cold_${language}`] || contextualSuggestions.cold_th;
    }
    if (healthKeywords.some((kw) => contextLower.includes(kw))) {
      return contextualSuggestions[`health_${language}`] || contextualSuggestions.health_th;
    }

    // Default follow-up suggestions based on language
    const defaultSuggestions: Record<string, string[]> = {
      th: ['ให้คำแนะนำเพิ่มเติมได้ไหม', 'มีวิธีป้องกันไหม', 'อาการนี้ร้ายแรงไหม'],
      en: ['Can you provide more details', 'How can I prevent this', 'Is this condition serious'],
      jp: ['詳細を教えてください', 'これを予防する方法は', 'この症状は深刻ですか'],
      id: [
        'Bisakah Anda memberikan detail lebih lanjut',
        'Bagaimana cara mencegah ini',
        'Apakah kondisi ini serius',
      ],
      zh: ['您能提供更多详细信息吗', '如何预防这种情况', '这种情况严重吗'],
      ko: [
        '더 자세한 정보를 제공해 주실 수 있나요',
        '이것을 어떻게 예방할 수 있나요',
        '이 상태가 심각한가요',
      ],
      vi: [
        'Bạn có thể cung cấp thêm chi tiết không',
        'Làm thế nào để ngăn ngừa điều này',
        'Tình trạng này có nghiêm trọng không',
      ],
      es: [
        '¿Puede proporcionar más detalles',
        '¿Cómo puedo prevenir esto',
        '¿Es grave esta condición',
      ],
      fil: [
        'Maaari mo bang magbigay ng karagdagang detalye',
        'Paano ko maiiwasan ito',
        'Seryoso ba ang kondisyong ito',
      ],
      hi: [
        'क्या आप अधिक विवरण प्रदान कर सकते हैं',
        'मैं इसे कैसे रोक सकता हूं',
        'क्या यह स्थिति गंभीर है',
      ],
    };

    return defaultSuggestions[language] || defaultSuggestions.th;
  };

  const suggestions = generateSuggestions();

  if (suggestions.length === 0) return null;

  return (
    <div className={cn('w-full bg-white border-t border-gray-100', className)}>
      <div className="max-w-4xl mx-auto px-4 py-3">
        <div className="flex items-center gap-2 mb-2 text-xs text-gray-500">
          <Sparkles className="h-3.5 w-3.5 text-sky-500" />
          <span className="font-medium">
            {t('contextualSuggestions', { ns: 'common' }) || 'Questions that might help'}
          </span>
        </div>

        <div
          className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
          style={{ scrollbarWidth: 'thin' }}>
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => onSuggestionClick(suggestion)}
              className="group relative flex items-center gap-2 px-4 py-2 text-left text-sm bg-gradient-to-r from-sky-50 to-indigo-50 border border-sky-200 rounded-full hover:border-sky-400 hover:shadow-md transition-all duration-200 active:scale-95 whitespace-nowrap flex-shrink-0">
              <div className="flex-shrink-0">
                <div className="w-5 h-5 rounded-full bg-sky-100 flex items-center justify-center group-hover:bg-sky-200 transition-colors">
                  <span className="text-xs font-bold text-sky-600">{index + 1}</span>
                </div>
              </div>
              <span className="text-gray-700 group-hover:text-sky-900 font-medium">
                {suggestion}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ContextualSuggestions;
