# Publikacja NetRunner na własnym GitHub i Vercel

## Własne repozytorium

Utwórz puste repozytorium na swoim koncie GitHub, np. `netrunner-chatbot`.
Wybierz Private. Nie inicjalizuj README, licencji ani `.gitignore` — projekt już
zawiera swoje pliki. Nie używaj repozytorium materiałów kursowych.
Po utworzeniu podaj tylko adres repozytorium, bez tokenów i haseł.
Logowanie i ewentualne autoryzacje wykonuj w interfejsie GitHub.

Przed wysłaniem kodu sprawdź właściciela zdalnego repozytorium. Commit zawiera
kod, fonty z licencją, testy, dokumentację i `package-lock.json`.
Nie zawiera `.env.local`, `.env`, `node_modules`, `.next` ani `.vercel`.
`.env.example` ma wyłącznie nazwy zmiennych z pustymi wartościami.
Jeżeli plik z sekretami jest już śledzony lub znajdzie się w commicie,
zatrzymaj publikację; samo dopisanie go do `.gitignore` nie wystarczy.

## Import do Vercel

Po zapisaniu kodu w swoim repozytorium wybierz w Vercel Add New → Project
i zaimportuj właśnie to repozytorium. Framework: Next.js, katalog główny `./`,
standardowe ustawienia budowania. Zachowaj `package-lock.json`.

W ustawieniach zmiennych serwerowych Vercel ustaw nazwy:

- `OPENROUTER_API_KEY`
- `OPENROUTER_MODEL`
- `CHAT_PASSWORD`
- `SESSION_SECRET`

Wartości wpisz wyłącznie w panelu Vercel. Nie dodawaj prefiksu `NEXT_PUBLIC_`.
`SESSION_SECRET` musi być silnym losowym sekretem (minimum 32 znaki).
Sekret lokalny został wygenerowany bez wypisywania wartości. Nie commituj go.
Dla produkcji zalecany jest osobny sekret. Możesz go wygenerować na swoim Macu
bez wypisywania w terminalu: `openssl rand -hex 32 | pbcopy`, wkleić bezpośrednio
w Vercel i potem wyczyścić schowek. Nie przesyłaj go przez czat.
Po zmianie zmiennych wykonaj nowe wdrożenie.

## Wspólny limit logowania — wymagany przed udostępnieniem

W projekcie Vercel: Firewall → Configure → New Rule:

- Warunek `@vercel/firewall`, Rate limit ID: `netrunner-login`.
- Akcja Rate Limit z blokowaniem, 5 żądań w 60 sekund.
- Zapisz i opublikuj regułę.

Kod korzysta ze wspólnego klucza limitu dla warsztatu. Bez działającej reguły
logowanie produkcyjne zwraca 503. Licznik w pamięci działa tylko lokalnie.
Jeśli plan Vercel nie udostępnia potrzebnej reguły, nie wyłączaj ochrony.
[Dokumentacja Vercel Firewall](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting-sdk).

## Weryfikacja wdrożonego linku — nie pomijaj

1. Otwórz link HTTPS w incognito. Ma pojawić się „Wpisz hasło”, bez czatu.
2. Błędne hasło ma zostać odrzucone; poprawne ma otworzyć czat.
3. Cookie sesji ma mieć `HttpOnly`, `SameSite=Strict`, `Secure` i wygaśnięcie.
4. „Wyjdź” ma usunąć cookie i ponownie pokazać ekran hasła; sprawdź także
   odświeżenie strony po wyjściu.
5. Bez cookie sesji `POST /api/chat` ma zwrócić 401 bez wywołania modelu.
6. Sprawdź limit logowania na rzeczywistym hostingu (szósta próba w minucie
   jest blokowana). Poczekaj na wygaśnięcie limitu przed kolejnym logowaniem.
7. Dopiero po kontroli hasła samodzielnie wyślij wiadomość do AI, sprawdź
   strumieniową odpowiedź i pamięć wcześniejszej wiadomości. To może naliczyć opłatę.

Nie uznawaj publikacji za zakończoną przed kontrolą hasła na docelowym linku.

Źródła: [GitHub — tworzenie repozytorium](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-new-repository),
[Vercel — zmienne środowiskowe](https://vercel.com/docs/environment-variables).
