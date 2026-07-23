import { useEffect, useState } from 'react';

const ONE_LINERS = [
  "I'll be back. — T-800",
  "May the Force be with you. — Star Wars",
  "Hasta la vista, baby. — T-800",
  "There's no place like home. — Dorothy",
  "Live long and prosper. — Spock",
  "I am your father. — Darth Vader",
  "Why so serious? — The Joker",
  "To infinity and beyond! — Buzz Lightyear",
  "I see dead people. — Cole Sear",
  "Show me the money! — Jerry Maguire",
  "You can't handle the truth! — Col. Jessup",
  "Life is like a box of chocolates. — Forrest Gump",
  "I love the smell of napalm in the morning. — Lt. Kilgore",
  "Say hello to my little friend! — Tony Montana",
  "Here's Johnny! — Jack Torrance",
  "Yippee-ki-yay. — John McClane",
  "Get to the chopper! — Dutch",
  "Come with me if you want to live. — Kyle Reese",
  "The dude abides. — The Dude",
  "Phone home. — E.T.",
  "Inconceivable! — Vizzini",
  "My precious. — Gollum",
  "Just keep swimming. — Dory",
  "Houston, we have a problem. — Jim Lovell",
  "I feel the need... the need for speed. — Maverick",
  "E.T. phone home. — E.T.",
  "I'm the king of the world! — Jack Dawson",
  "Keep the change, ya filthy animal. — Kevin McCallister",
  "Wax on, wax off. — Mr. Miyagi",
  "Nobody puts Baby in a corner. — Johnny Castle",
  "Great Scott! — Doc Brown",
  "Roads? Where we're going, we don't need roads. — Doc Brown",
  "If it bleeds, we can kill it. — Dutch",
  "Dodge this. — Trinity",
  "I know kung fu. — Neo",
  "Red pill or blue pill? — Morpheus",
  "Welcome to the desert of the real. — Morpheus",
  "I am inevitable. — Thanos",
  "I am Iron Man. — Tony Stark",
  "Avengers, assemble. — Captain America",
  "On your left. — Captain America",
  "We are Groot. — Groot",
  "I can do this all day. — Captain America",
  "Why is Gamora? — Drax",
  "I'm Mary Poppins, y'all! — Yondu",
  "Dormammu, I've come to bargain. — Doctor Strange",
  "We have a Hulk. — Tony Stark",
  "Puny god. — Hulk",
  "I understood that reference. — Captain America",
  "Part of the journey is the end. — Tony Stark",
  "Whatever it takes. — Avengers",
  "I am Groot. — Groot",
  "We're in the endgame now. — Doctor Strange",
  "You should have gone for the head. — Thor",
  "Is this your king? — Erik Killmonger",
  "Wakanda forever! — T'Challa",
  "The thing about the future is, it hasn't happened yet. — Doctor Strange",
  "I am the captain now. — Barkhad Abdi",
  "It's a trap! — Admiral Ackbar",
  "Do or do not. There is no try. — Yoda",
  "Fear is the path to the dark side. — Yoda",
  "Size matters not. — Yoda",
  "That is why you fail. — Yoda",
  "I find your lack of faith disturbing. — Darth Vader",
  "Never tell me the odds. — Han Solo",
  "I am a Jedi, like my father before me. — Luke Skywalker",
  "Help me, Obi-Wan Kenobi. — Princess Leia",
  "Aren't you a little short for a stormtrooper? — Princess Leia",
  "Somebody has to save our skins. — Princess Leia",
  "I love you. — Leia / I know. — Han Solo",
  "Punch it! — Han Solo",
  "Chewie, we're home. — Han Solo",
  "The Force will be with you. Always. — Obi-Wan Kenobi",
  "Hello there. — Obi-Wan Kenobi",
  "It's over, Anakin. I have the high ground. — Obi-Wan Kenobi",
  "So uncivilized. — Obi-Wan Kenobi",
  "I have spoken. — Kuiil",
  "This is the way. — The Mandalorian",
];

function getRandomIndex(length, current) {
  let next = Math.floor(Math.random() * length);
  while (next === current && length > 1) {
    next = Math.floor(Math.random() * length);
  }
  return next;
}

function ProgressPanel({ progress }) {
  const roundedProgress = Math.round(progress);
  const [index, setIndex] = useState(() => Math.floor(Math.random() * ONE_LINERS.length));

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => getRandomIndex(ONE_LINERS.length, prev));
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const waveText = ONE_LINERS[index].split('').map((char, i) => (
    <span key={i}>{char === ' ' ? '\u00A0' : char}</span>
  ));

  return (
    <div className="info-card progress-panel">
      <p className="one-liner">{waveText}</p>
      <div className="progress-bar">
        <div style={{ width: `${roundedProgress}%` }} className="progress-fill" />
      </div>
      <p className="progress-percent">{roundedProgress}%</p>
    </div>
  );
}

export default ProgressPanel;
