# GoalPredict για GitHub Pages

Δεν χρειάζεται server ούτε Node στον υπολογιστή σου. Το GitHub Actions τρέχει κάθε 30 λεπτά, φέρνει τα δεδομένα από το API-Football, φτιάχνει τις σελίδες και τις δημοσιεύει στο GitHub Pages.

## Εγκατάσταση (με τη σειρά)
1. **Νέο repository.** GitHub → New repository → όνομα π.χ. `goalpredict` → **Public** (το δωρεάν Pages θέλει public repo) → Create.
2. **Ανέβασε τα αρχεία.** Εξαγωγή του zip. Άνοιξε τον φάκελο `goalpredict-pages`, επίλεξε ΟΛΑ όσα περιέχει (Ctrl+A) και σύρε τα στο repo (Add file → Upload files). Πρέπει να ανέβει και ο κρυφός φάκελος `.github` (εμφάνισε τα κρυφά στοιχεία στα Windows: Προβολή → Εμφάνιση → Κρυφά στοιχεία). Commit changes.
   Αν ο `.github` δεν ανέβει: Add file → Create new file, γράψε στο όνομα `.github/workflows/update.yml`, επικόλλησε το περιεχόμενο του αρχείου και κάνε Commit.
3. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
4. **Settings → Secrets and variables → Actions → New repository secret:**
   - Name `API_FOOTBALL_KEY`, Secret: το κλειδί σου από το dashboard.api-football.com (ΜΟΝΟ εδώ, ποτέ σε αρχείο).
   - Προαιρετικά `ANTHROPIC_API_KEY` για τις αναλύσεις AI.
5. **Settings → Actions → General → Workflow permissions → Read and write permissions → Save.**
6. **Actions → «Update and publish» → Run workflow.** Η πρώτη εκτέλεση παίρνει 10-20 λεπτά (το δωρεάν API επιτρέπει 10 κλήσεις το λεπτό). Μετά το site ανοίγει στο `https://ΟΝΟΜΑ-ΧΡΗΣΤΗ.github.io/goalpredict/`.

## Αυτόματη λειτουργία
- Κάθε 30 λεπτά: νέα αποτελέσματα, επίσημες ενδεκάδες, έλεγχος προγνωστικών, ανανέωση σελίδων.
- Στην αλλαγή ημέρας (00:05 Ελλάδας) φορτώνονται οι νέοι αγώνες και οι αναλύσεις τους. Η αρχική σελίδα μεταφέρει τους επισκέπτες στη σωστή ημέρα από το πρόγραμμα περιήγησης, ακόμα κι αν το GitHub καθυστερήσει το run.
- Τα δεδομένα αποθηκεύονται στον φάκελο `data/` του repo (commit από το bot).

## Αλλαγή αναλύσεων και προγνωστικών (αντί για Admin Panel)
Επεξεργάσου το `data/overrides.json` μέσα στο GitHub (στυλό ✏️ → Commit). Οδηγίες και παράδειγμα υπάρχουν μέσα στο αρχείο. Μπορείς να κρύψεις αγώνα, να γράψεις δικό σου κείμενο ανάλυσης και να αλλάξεις το προγνωστικό (πριν την έναρξη του αγώνα). Η αλλαγή εμφανίζεται στο επόμενο run ή αμέσως αν πατήσεις Run workflow.

## Ρυθμίσεις
Settings → Secrets and variables → Actions → **Variables**: `MAX_ANALYSES_PER_DAY` (10), `API_DELAY_MS` (6500, βάλε 300 σε πληρωμένο πλάνο), `ENRICH_TOMORROW` (true για αναλύσεις και της επόμενης ημέρας), `ENABLE_CORNERS` (true μόνο με πληρωμένο API), `AI_MODEL`, `SITE_NAME`.

## Περιορισμοί
- Δεν υπάρχει login/Admin Panel: δεν γίνεται σε στατικό site.
- Τα αποτελέσματα ανανεώνονται κάθε ~30 λεπτά και όχι ζωντανά. Τα προγραμματισμένα runs του GitHub μπορεί να καθυστερούν.
- Με το δωρεάν API φτάνουν περίπου 10 αναλύσεις την ημέρα.
- Public repo: τα δεδομένα στο `data/` είναι ορατά σε όλους (όχι τα κλειδιά).
