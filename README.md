# Domowe Dyżury

Rodzinna tablica obowiązków: domownicy odhaczają wykonane czynności (np. rozładowanie zmywarki, wyniesienie śmieci, własne), a zakładka Wyniki pokazuje, kto ile i czego zrobił — za dziś, wczoraj, ostatnie 7 dni albo wybrany miesiąc (strzałkami można cofać się do wcześniejszych miesięcy) (ranking, diagram kołowy udziału, słupki albo nałożone linie domowników dzień po dniu / godzina po godzinie, wykres narastający, najczęstsze czynności, tabela, historia).

- Aplikacja: https://panbadek.github.io/Mgladom/
- Dane i logowanie: Firebase (Firestore + logowanie e-mail/hasło)
- Wiele rodzin: każda loguje się nazwą rodziny i 4-cyfrowym PIN-em (konto `r.<nazwa>@<projekt>.firebaseapp.com`, hasło `dyzury-<PIN>`), dane w `families/{uid}/…`
- Poprzednia wersja (jedno konto `rodzina@…` z hasłem): przy pierwszym wejściu dane przenoszą się do nowej rodziny, w starej bazie zostaje znacznik `meta/migrated`
- Szybkość: zmiany z tego telefonu widać od razu (baza potwierdza je w tle, przy błędzie znikają z komunikatem); Firestore bez IndexedDB (`memoryLocalCache`); szybki start z kopii w localStorage (`dd.cache.<uid>`, czyszczona przy wylogowaniu); ponowne łączenie po powrocie aplikacji z tła
- Ikonki czynności: `icons.js` (dobierane po nazwie albo wybrane ręcznie)
- Reguły bazy: `firestore.rules` (wklejone w konsoli Firebase → Firestore → Rules)
- Przed każdym wgraniem: `python3 tools/bump.py` (nowy numer wersji, telefony pokażą pasek „Jest nowa wersja”)

Kolekcje każdej rodziny (`families/{uid}/…`; sam dokument rodziny trzyma `{name, slug}`):
- `members` — domownicy `{name, slot, order}` (slot = kolor z palety 0–7)
- `chores` — czynności `{name, icon, order}`
- `meta` — znaczniki jednorazowych zmian
- `entries` — wpisy `{m, mn, ms, c, cn, ci, once?, d?, day, t}` (`c = "_once"` dla czynności jednorazowych, `d` = opis); trzymają też imię i nazwę czynności, więc po usunięciu domownika lub czynności historia nadal pokazuje nazwy
