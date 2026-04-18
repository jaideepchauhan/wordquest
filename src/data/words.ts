export interface WordItem {
  word: string;
  category: string;
  language: "en-IN";
  audioKey: string;
  definition: string;
  example: string;
}

interface WordContent {
  word: string;
  definition: string;
  example: string;
}

const slugifyAudioKey = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const buildWordList = (
  category: string,
  language: WordItem["language"],
  entries: WordContent[],
): WordItem[] =>
  entries.map((entry, index) => ({
    ...entry,
    category,
    language,
    audioKey: `${slugifyAudioKey(category)}-${String(index + 1).padStart(3, "0")}`,
  }));

const ENGLISH_WORDS: WordContent[] = [
  { word: "flying", definition: "moving through the air", example: "The birds are flying over the lake." },
  { word: "talking", definition: "using words to speak", example: "The children are talking quietly in class." },
  { word: "bright", definition: "full of light or shining strongly", example: "The bright sun warmed the playground." },
  { word: "different", definition: "not the same", example: "The two bags are different colours." },
  { word: "goose", definition: "a large water bird", example: "A goose swam across the pond." },
  { word: "thinks", definition: "uses the mind to form ideas", example: "Meera thinks before she answers." },
  { word: "sitting", definition: "resting on a seat or the ground", example: "The puppy is sitting by the door." },
  { word: "whales", definition: "very large animals that live in the sea", example: "Whales come up to breathe air." },
  { word: "nights", definition: "times when it is dark", example: "The stars shine on clear nights." },
  { word: "mountains", definition: "very high areas of land", example: "We saw snowy mountains in the distance." },
  { word: "valleys", definition: "low land between hills or mountains", example: "A river flowed through the green valleys." },
  { word: "climbing", definition: "going upward with hands or feet", example: "The monkey is climbing the tree." },
  { word: "bamboo", definition: "a tall hollow plant", example: "The panda likes to eat bamboo." },
  { word: "colourful", definition: "full of many bright colours", example: "The colourful kite danced in the sky." },
  { word: "amazing", definition: "very surprising or wonderful", example: "The magic trick was amazing." },
  { word: "dragon", definition: "a large fire-breathing creature in stories", example: "The dragon guarded the treasure in the cave." },
  { word: "beautiful", definition: "very pretty or lovely", example: "The garden looked beautiful after the rain." },
  { word: "admire", definition: "to look at something with liking or respect", example: "We admire the rainbow after the storm." },
  { word: "lovely", definition: "very nice or beautiful", example: "What a lovely drawing you made!" },
  { word: "square", definition: "a shape with four equal sides", example: "The window is square." },
  { word: "simple", definition: "easy to understand or do", example: "This puzzle has a simple answer." },
  { word: "elegant", definition: "graceful and neat", example: "She wore an elegant dress for the show." },
  { word: "strong", definition: "having a lot of power", example: "The strong rope held the swing safely." },
  { word: "proud", definition: "feeling happy about doing well", example: "I felt proud of my neat handwriting." },
  { word: "agree", definition: "to have the same idea as someone else", example: "We agree on the rules of the game." },
  { word: "thick", definition: "wide from one side to the other", example: "This storybook is thick." },
  { word: "forests", definition: "large areas filled with many trees", example: "Forests are home to many animals." },
  { word: "pine", definition: "a type of evergreen tree", example: "The pine tree stayed green in winter." },
  { word: "toward", definition: "in the direction of", example: "We walked toward the school gate." },
];

const EVS_WORDS: WordContent[] = [
  { word: "nutrient", definition: "something in food or soil that helps living things grow", example: "Milk has nutrients that help us grow strong." },
  { word: "upward", definition: "toward a higher place", example: "The balloon floated upward." },
  { word: "sunlight", definition: "light that comes from the sun", example: "Plants need sunlight to make food." },
  { word: "absence", definition: "not being present", example: "Your absence was noticed in class today." },
  { word: "climb", definition: "to go up", example: "We climb the stairs every day." },
  { word: "shoot", definition: "a new part of a plant that grows upward", example: "A green shoot came out of the seed." },
  { word: "root", definition: "the part of a plant that grows under the soil", example: "The root takes in water from the soil." },
  { word: "flexible", definition: "easy to bend without breaking", example: "A flexible stem bends in the wind." },
  { word: "fibrous", definition: "full of thin fibres", example: "Grass has a fibrous root system." },
  { word: "duckweed", definition: "a very small plant that floats on water", example: "Duckweed covered the top of the pond." },
  { word: "simple", definition: "easy or plain", example: "A simple leaf has one blade." },
  { word: "soil", definition: "the top layer of earth where plants grow", example: "We planted seeds in rich soil." },
  { word: "carrot", definition: "an orange root vegetable", example: "The rabbit nibbled a carrot." },
  { word: "fix", definition: "to join firmly or repair", example: "Please fix the stick beside the plant." },
  { word: "stem", definition: "the plant part that holds leaves and flowers", example: "The stem carries water to the leaves." },
  { word: "stick", definition: "a thin piece of wood", example: "We used a stick to support the plant." },
  { word: "fruit", definition: "the part of a plant that has seeds inside", example: "A mango is a sweet fruit." },
  { word: "leaves", definition: "flat green parts of a plant", example: "Leaves make food for the plant." },
  { word: "flowers", definition: "the colourful parts of a plant", example: "Bees visit flowers for nectar." },
  { word: "seeds", definition: "small parts that can grow into new plants", example: "We sowed seeds in the garden." },
  { word: "perfume", definition: "a sweet smell or a liquid with a sweet smell", example: "Rose flowers are used to make perfume." },
  { word: "medicine", definition: "something used to help a sick person get well", example: "Grandma took her medicine after dinner." },
  { word: "edible", definition: "safe to eat", example: "Spinach leaves are edible." },
  { word: "smooth", definition: "even and not rough", example: "The pebble felt smooth in my hand." },
  { word: "rough", definition: "not even; bumpy", example: "Tree bark is rough." },
  { word: "spices", definition: "plant parts used to add flavour to food", example: "Spices make curry smell and taste good." },
  { word: "pulses", definition: "dried seeds like lentils and beans used as food", example: "Pulses are rich in protein." },
  { word: "rice", definition: "small grains used as food", example: "We ate rice with dal." },
  { word: "corn", definition: "yellow grains that grow on maize plants", example: "The farmer grew corn in the field." },
  { word: "cooking", definition: "preparing food with heat", example: "Father is cooking dinner." },
];

const COMPUTER_WORDS: WordContent[] = [
  { word: "Devices", definition: "tools or machines made for a job", example: "Phones and tablets are useful devices." },
  { word: "Hardware", definition: "the physical parts of a computer", example: "The keyboard is computer hardware." },
  { word: "Application", definition: "a program used to do a task", example: "I opened a drawing application on the computer." },
  { word: "Software", definition: "the programs that tell a computer what to do", example: "Software helps the computer run games and lessons." },
  { word: "Operating", definition: "working or controlling how something runs", example: "The operating buttons help us control the machine." },
  { word: "System", definition: "a group of parts that work together", example: "A computer system has many connected parts." },
  { word: "Printer", definition: "a machine that prints on paper", example: "The printer made my worksheet." },
  { word: "Headphones", definition: "things worn on the ears to hear sound", example: "I wore headphones to listen to music." },
  { word: "Windows", definition: "a computer operating system by Microsoft", example: "Windows started when the computer turned on." },
  { word: "Minimise", definition: "to make a window smaller on the screen", example: "Click minimise to hide the open page." },
  { word: "Taskview", definition: "a screen that shows all open windows", example: "Taskview lets me see all my open apps." },
  { word: "Desktop", definition: "the main screen area of a computer", example: "The shortcut is on the desktop." },
  { word: "Touch", definition: "to press lightly with a finger", example: "Touch the screen to open the app." },
  { word: "Screen", definition: "the part that shows pictures and words", example: "The screen is bright and clear." },
  { word: "Monitor", definition: "a computer screen", example: "The monitor showed the science video." },
  { word: "Projector", definition: "a machine that shows images on a wall or screen", example: "The projector displayed the chart to the class." },
  { word: "Pen Drive", definition: "a small device used to store files", example: "Save the photo on the Pen Drive." },
  { word: "Joystick", definition: "a controller used to move things in a game", example: "He moved the plane with the joystick." },
  { word: "Folder", definition: "a place to keep files on a computer", example: "Put the document in the blue folder." },
  { word: "Recycle Bin", definition: "the place where deleted files go first", example: "I restored the picture from the Recycle Bin." },
  { word: "Ribbon", definition: "a strip of tools and menus at the top of some programs", example: "The ribbon has many buttons to click." },
  { word: "Zoom", definition: "to make something look bigger or smaller on the screen", example: "Use zoom to read the page clearly." },
  { word: "Slider", definition: "a bar you move to change a setting", example: "Move the slider to increase the volume." },
];

const SPICES_WORDS: WordContent[] = [
  { word: "Betel", definition: "a leaf often chewed after meals", example: "Grandma bought fresh betel leaves." },
  { word: "Cherry", definition: "a small round red fruit", example: "A cherry sat on top of the cake." },
  { word: "Aniseed", definition: "tiny seeds with a sweet smell and taste", example: "Aniseed smells sweet and fresh." },
  { word: "Gulkand", definition: "a sweet preserve made from rose petals", example: "Gulkand tastes cool and sweet." },
  { word: "Lime", definition: "a small sour green citrus fruit", example: "We squeezed lime over the salad." },
  { word: "Ground coconut", definition: "grated or crushed coconut", example: "Mother used ground coconut in the chutney." },
  { word: "Betel nut", definition: "a hard nut chewed with betel leaf", example: "The shopkeeper cut the betel nut into pieces." },
  { word: "Catechu", definition: "a brown plant extract used in paan", example: "The seller spread catechu on the leaf." },
  { word: "Cardamom", definition: "a small fragrant spice pod", example: "Cardamom made the kheer smell lovely." },
  { word: "Pepper mint", definition: "mint with a strong cool taste", example: "Pepper mint makes the mouth feel fresh." },
  { word: "Groundnut", definition: "the peanut plant seed used as food", example: "We roasted groundnut for a snack." },
  { word: "Peanut", definition: "an edible nut from the groundnut plant", example: "The monkey picked up a peanut." },
  { word: "Chestnut", definition: "an edible brown nut", example: "We roasted chestnuts in winter." },
  { word: "Sago", definition: "small white pearls made from starch", example: "Sago is used to make kheer." },
  { word: "Sesame", definition: "tiny seeds that contain oil", example: "Sesame seeds were sprinkled on the sweet." },
];

export const WORD_LISTS: Record<string, WordItem[]> = {
  English: buildWordList("English", "en-IN", ENGLISH_WORDS),
  EVS: buildWordList("EVS", "en-IN", EVS_WORDS),
  Computer: buildWordList("Computer", "en-IN", COMPUTER_WORDS),
  Spices: buildWordList("Spices", "en-IN", SPICES_WORDS),
};

export const ALL_CATEGORIES = Object.keys(WORD_LISTS);
