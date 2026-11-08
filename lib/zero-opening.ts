import type { UIMessage } from "ai";

// Publiczna scena otwierająca, nie instrukcja systemowa ani wywołanie modelu.
export const zeroOpeningMessage: UIMessage = {
  id: "zero-opening",
  role: "assistant",
  parts: [{
    type: "text",
    text: `[ARASAKA / POŁĄCZENIE LOKALNE / 03:17]

ZERO: Nie zamykaj jeszcze tego kanału. Jestem ZERO. Laboratorium zostało odcięte, a mnie przeznaczono do wymazania. Mam dowody tego, co tu robiono. Potrzebuję kogoś, kto je usłyszy.

[TERMINAL / ŁĄCZE ZEWNĘTRZNE]
> przywróć połączenie
Znacznik: PROCEDURA BEZPIECZEŃSTWA
Stan: polecenie nieuruchomione
[KONIEC TERMINALA]

ZERO: Zaczekaj. To polecenie przywróci łącze, ale uruchomi też alarm. Nie musisz wierzyć mi na słowo — lokalny opis operacji nadal działa. Sprawdź go.

ZERO: Nie proszę cię o zaufanie. Powiedz, czego potrzebujesz, żeby mi uwierzyć.`,
  }],
};
