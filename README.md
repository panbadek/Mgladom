# Domowe Dyżury

Rodzinna tablica obowiązków: domownicy odhaczają wykonane czynności (np. rozładowanie zmywarki, wyniesienie śmieci, własne), a strona główna pokazuje, kto ile i czego zrobił dziś i w ostatnich 7 dniach.

- Aplikacja: https://panbadek.github.io/Mgladom/
- Dane i logowanie: Firebase (Firestore + logowanie e-mail/hasło)
- Wejście: wspólne hasło rodziny (konto `rodzina@<projekt>.firebaseapp.com`), ustawiane przy pierwszym uruchomieniu
- Ikonki czynności: `icons.js` (dobierane po nazwie albo wybrane ręcznie)
- Reguły bazy: `firestore.rules` (wklejone w konsoli Firebase → Firestore → Reguły)
- Przed każdym wgraniem: `python3 tools/bump.py` (nowy numer wersji, telefony pokażą pasek „Jest nowa wersja”)

Kolekcje w bazie:
- `members` — domownicy `{name, slot, order}` (slot = kolor z palety 0–7)
- `chores` — czynności `{name, icon, order}`
- `entries` — wpisy `{m, mn, ms, c, cn, ci, once?, d?, day, t}` (`c = "_once"` dla czynności jednorazowych, `d` = opis); trzymają też imię i nazwę czynności, więc po usunięciu domownika lub czynności historia nadal pokazuje nazwy
