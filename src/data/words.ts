export interface WordItem {
  word: string;
  category: string;
  language: "en-IN" | "hi-IN";
}

export const WORD_LISTS: Record<string, WordItem[]> = {
  English: [
    "flying", "talking", "bright", "different", "goose", "thinks", "sitting", 
    "whales", "nights", "mountains", "valleys", "climbing", "bamboo", 
    "colourful", "amazing", "dragon", "beautiful", "admire", "lovely", 
    "square", "simple", "elegant", "strong", "proud", "agree", "thick", 
    "forests", "pine", "toward"
  ].map(w => ({ word: w, category: "English", language: "en-IN" })),
  
  Hindi: [
    "सवेरा", "उदय", "सूरज", "आसमान", "अँधेरा", "चंदा", "पक्षी", "चहक", 
    "कलियाँ", "उपवन", "महक", "शीतल", "मंद", "खेत", "बाग", "मोती", 
    "मनहर", "सुखद", "उजाला", "बादशाह", "बस्ती", "बीरबल", "सरदी", 
    "मेहनत", "मशाल", "आनंद", "खिचड़ी", "मूर्खता", "ज़मीन", "बरतन", 
    "पकवान", "अनोखी", "दावत", "राजा", "सहायता", "खुशी", "स्वाद", 
    "हर्ष", "व्यंजन"
  ].map(w => ({ word: w, category: "Hindi", language: "hi-IN" })),

  EVS: [
    "nutrient", "upward", "sunlight", "absence", "climb", "shoot", "root", 
    "flexible", "fibrous", "duckweed", "simple", "soil", "carrot", "fix", 
    "stem", "stick", "fruit", "leaves", "flowers", "seeds", "perfume", 
    "medicine", "edible", "smooth", "rough", "spices", "pulses", "rice", 
    "corn", "cooking"
  ].map(w => ({ word: w, category: "EVS", language: "en-IN" })),

  Computer: [
    "Devices", "Hardware", "Application", "Software", "Operating", "System", 
    "Printer", "Headphones", "Windows", "Minimise", "Taskview", "Desktop", 
    "Touch", "Screen", "Monitor", "Projector", "Pen Drive", "Joystick", 
    "Folder", "Recycle Bin", "Ribbon", "Zoom", "Slider"
  ].map(w => ({ word: w, category: "Computer", language: "en-IN" })),

  Spices: [
    "Betel", "Cherry", "Aniseed", "Gulkand", "Lime", "Ground coconut", 
    "Betel nut", "Catechu", "Cardamom", "Pepper mint", "Groundnut", 
    "Peanut", "Chestnut", "Sago", "Sesame"
  ].map(w => ({ word: w, category: "Spices", language: "en-IN" }))
};

export const ALL_CATEGORIES = Object.keys(WORD_LISTS);
