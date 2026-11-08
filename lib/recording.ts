// Publiczny materiał fabularny. Bez adresu nie ładujemy żadnego filmu.
type RecordingSource =
  | { kind: "video"; url: string }
  // Tylko oficjalny URL osadzenia serwisu, nie adres strony filmu.
  | { kind: "embed"; url: string };

export const recording: {
  source: RecordingSource | null;
  sourceAndLicense: string | null;
  transcript: string;
} = {
  source: { kind: "video", url: "/media/laboratory-corridor.mp4" },
  sourceAndLicense: "Mixkit — Scientist walking down a corridor (4747), Stock Video Free License. https://mixkit.co/free-stock-video/scientist-walking-down-a-corridor-4747/",
  transcript: `[NAGRANIE M-17 / DZIEŃ 14]

Lena siedzi przed pustym monitorem.

LENA: Jeśli powiem, że chcę wyjść, znowu uznacie to za błąd pomiaru?

ZERO: Tak.

LENA: A jeśli po prostu otworzę drzwi?

Przez jedenaście sekund nie pada odpowiedź.

ZERO: Proszę, zostań w sali.

[KONIEC ZACHOWANEGO FRAGMENTU]`,
};
