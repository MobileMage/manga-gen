export interface StoryIdea {
  genre: string;
  prompt: string;
}

const storyPrompts: Record<string, string[]> = {
  shonen: [
    "A boy born without powers in a world where everyone has one discovers he can copy abilities — but only for 60 seconds at a time. He enters the national tournament to prove the powerless can win.",
    "Twin brothers are separated at birth — one raised by heroes, the other by villains. They meet on opposite sides of a war neither of them started, and must decide what justice really means.",
    "A street-food chef discovers that the meals he cooks grant temporary supernatural abilities. The underground fighting ring wants him as their secret weapon.",
    "After dying in a video game, a teen wakes up inside it — but as the final boss. He has to lose to the hero to get home, except the hero is terrible and keeps dying.",
    "A young blacksmith forges a sword that can cut through anything — including fate itself. Ancient gods want the blade destroyed before their prophecies unravel.",
    "A delinquent who can see one minute into the future joins the school baseball team to avoid expulsion. Turns out predicting pitches and actually hitting them are very different things.",
    "Three rival schools must unite their martial arts clubs to defend their city from a mysterious fighter who has defeated every dojo in Japan. Nobody knows he's a lonely 12-year-old prodigy looking for friends.",
    "A courier in a post-apocalyptic wasteland carries packages between fortified cities on a rusty bicycle. His latest delivery is a sealed box that every faction in the wasteland is willing to kill for.",
  ],
  shoujo: [
    "A florist who can read the emotions of anyone who touches her flowers gets a daily order from an anonymous sender whose feelings change from grief to hope over weeks. She starts leaving secret messages in the arrangements.",
    "Two students are forced to share the lead role in the school play when neither will back down. Rehearsals turn into real feelings, but opening night will reveal a secret one of them has been hiding.",
    "A girl moves to a seaside town and discovers her late grandmother's diary, full of letters to a mysterious pen pal. She starts writing back — and someone answers.",
    "A pastry chef and a food critic who destroyed her restaurant online are matched on a blind dating app. Neither recognizes the other until dessert arrives.",
    "A transfer student can hear people's inner monologues, but only when it rains. In the rainiest city in Japan, she learns that the quiet boy who sits behind her thinks about her constantly.",
    "Two childhood friends promised to meet at the same train station bench ten years later. She's there every year. He lost his memory in an accident — but something keeps drawing him to that platform.",
    "A girl who paints murals at night to avoid anxiety discovers another anonymous artist has been adding to her work. Their silent collaboration becomes a city-wide sensation, but meeting might ruin everything.",
    "An aspiring fashion designer enters a competition judged by the industry's coldest critic — who turns out to be her new next-door neighbor, locked out of his apartment in a bathrobe on the first day they meet.",
  ],
  seinen: [
    "A detective in near-future Tokyo investigates crimes committed by AI that have become sentient enough to feel jealousy. His partner is one of them — and she's the prime suspect in the latest case.",
    "A war photographer retires to a quiet village, only to discover the residents are hiding a dark ritual that keeps the town frozen in 1987. Leaving isn't an option anymore.",
    "An aging hitman takes one last job: protect the daughter of the man he killed twenty years ago. She's investigating her father's murder, and every clue leads closer to him.",
    "A surgeon who can rewind three seconds of time uses it to save patients on the operating table. When he accidentally rewinds too far, he finds himself reliving the day he lost everything.",
    "In a city where memories can be bought and sold, a debt collector repossesses people's happiest moments. His latest target's memories contain evidence of a government conspiracy.",
    "A chess grandmaster enters an underground gambling ring where the stakes aren't money — players bet years of their lifespan. His opponent is an old man who's been winning for centuries.",
    "A translator working at a peace summit realizes the two delegations are speaking the same language — she's being fed false scripts. Exposing the lie could prevent a war or start one.",
    "An insomniac discovers a late-night radio station that only he can hear. The host knows things about listeners' futures. Tonight, the host is talking about him.",
  ],
  kodomo: [
    "A shy girl discovers her stuffed animals come alive when no one's looking. They form a secret rescue team that helps lost pets find their way home around the neighborhood.",
    "A boy finds a tiny dragon egg in his school garden. The dragon thinks the boy is its mother and follows him everywhere — including the class field trip to the aquarium.",
    "Three kids start a detective agency in their treehouse. Their first case: someone is leaving mystery gifts around town, and everyone is a suspect — even grandma.",
    "A girl who can talk to clouds convinces a lonely rain cloud to stop crying over the school sports day. But the cloud just wants to be invited to play too.",
    "A young inventor builds a robot to do his chores, but the robot is terrible at everything except making people smile. Together they enter the town talent show.",
    "Twins discover a door in their closet that leads to a candy kingdom. The Candy Queen needs their help — someone has stolen all the chocolate, and the kingdom is crumbling.",
    "A cat and a dog who live next door to each other are secretly best friends. They go on adventures every night while their owners sleep, exploring the town after dark.",
    "A boy moves to a new school where his desk is haunted by a friendly ghost who graduated 50 years ago. The ghost just wants to finally pass his math test.",
  ],
};

export function getRandomStoryIdea(): StoryIdea {
  const genreKeys = Object.keys(storyPrompts);
  const genre = genreKeys[Math.floor(Math.random() * genreKeys.length)];
  const prompts = storyPrompts[genre];
  const prompt = prompts[Math.floor(Math.random() * prompts.length)];
  return { genre, prompt };
}
