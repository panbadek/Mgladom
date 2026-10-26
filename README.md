# Domowe Dyżury

Rodzinna tablica obowiązków: domownicy odhaczają wykonane czynności (np. rozładowanie zmywarki, wyniesienie śmieci, własne), a strona główna pokazuje, kto ile i czego zrobił dziś i w ostatnich 7 dniach.

- Aplikacja: https://panbadek.github.io/Domowe-dyzury/
- Dane i logowanie: Firebase (Firestore + logowanie e-mail/hasło)
- Wejście: wspólne hasło rodziny (konto `rodzina@<projekt>.firebaseapp.com`), ustawiane przy pierwszym uruchomieniu
- Reguły bazy: `firestore.rules` (wklejone w konsoli Firebase → Firestore → Reguły)
- Przed każdym wgraniem: `python3 tools/bump.py` (nowy numer wersji, telefony pokażą pasek „Jest nowa wersja”)

Kolekcje w bazie:
- `members` — domownicy `{name, color, order}`
- `chores` — czynności `{name, order}`
- `entries` — wpisy `{m, mn, mc, c, cn, day, t}`; trzymają też imię i nazwę czynności, więc po usunięciu domownika lub czynności historia nadal pokazuje nazwy
