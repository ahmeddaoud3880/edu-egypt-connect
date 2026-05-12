# Egypt.edu — RAG Textbook System

نظام Retrieval-Augmented Generation للكتب الدراسية الرسمية لكل المراحل والصفوف.

## الفكرة باختصار

1. تضع الـ PDF داخل `ai_agent/rag/books/<stage>/g<N>/<subject>/` (مثال: `books/primary/g3/arabic/main.pdf`).
2. تُشغّل `python -m rag.ingest --file ... --grade ... --stage-name ... --subject-name ...`.
3. السكربت:
   - يقرأ الـ PDF ويُقسّمه إلى chunks (~900 حرف، تداخل 150).
   - يصنع embedding (768d) لكل chunk عبر **Gemini `text-embedding-004`** (مجاني).
   - يحفظ كل شيء في `rag_books` و `rag_chunks` على Postgres + pgvector.
4. وكلاء الذكاء (طالب / معلم / ولي أمر) يحصلون تلقائياً على أدوات بحث RAG:
   - `rag_search_textbook(query, grade_number, subject_id)` — للأسئلة الأكاديمية.
   - `rag_list_books(grade_number)` — لاستعراض الكتب المتاحة.
   - `rag_generate_questions_context(topic, grade_number, subject_id)` — للمعلم لتوليد أسئلة من الكتاب.

## المتطلبات

```bash
cd ai_agent
pip install -r requirements.txt   # يضمن pypdf + google-generativeai
```

في `ai_agent/.env` لا بد من:

```
GEMINI_API_KEY=AIza...
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
```

> Gemini Free Tier يكفي لاستيعاب آلاف الصفحات في اليوم.

## بنية المجلدات الموصى بها

```
ai_agent/rag/books/
├── kg/                       # رياض أطفال
│   └── g1/...
├── primary/                  # ابتدائى (g1..g6)
│   ├── g1/arabic/<book>.pdf
│   ├── g1/math/<book>.pdf
│   ├── g3/science/<book>.pdf
│   └── ...
├── prep/                     # إعدادى (g1..g3)
│   └── g2/social/<book>.pdf
└── secondary/                # ثانوى (g1..g3)
    └── g2/physics/<book>.pdf
```

> الـ PDFs ليست مشمولة في الـ git (راجع `rag/.gitignore`).

## كيفية إضافة كتاب

```bash
cd ai_agent
python -m rag.ingest \
  --file rag/books/primary/g3/arabic/main.pdf \
  --title "اللغة العربية - الصف الثالث الابتدائي" \
  --grade 3 \
  --stage-name "ابتدائى" \
  --subject-name "اللغة العربية"
```

السكربت idempotent — تشغيله مرة أخرى لنفس الملف يتجاوزه إلا لو أضفت `--force`.

## استدعاء يدوي للبحث (تجريبي)

```python
from rag.search import search_textbook_chunks
print(search_textbook_chunks("ما هي القراءة الصامتة؟", grade_number=3, top_k=3))
```

## كيف يستخدمها الـ AI تلقائياً

- **الطالب** يسأل "اشرحلي درس الجملة الاسمية" → الوكيل يستدعي `rag_search_textbook`،
  يحصل على فقرات من الكتاب، ويُجيب من تلك الفقرات مع رقم الصفحة.
- **المعلم** يطلب "اعمل لي 5 أسئلة من فصل الكسور" → يستدعي
  `rag_generate_questions_context`، ثم يكتب أسئلة الـ MCQ والإجابات
  مستندة فقط للنصوص المرجعة.
- **ولي الأمر** يطلب "ابني عنده درس عن الكسور، اشرحلي" → يستدعي
  `rag_search_textbook` بنفس صف الابن من قاعدة البيانات.

## بنية قاعدة البيانات

| الجدول | المحتوى |
|---|---|
| `rag_books` | عنوان، صف، مرحلة، مادة، عدد الصفحات والـ chunks، file_hash |
| `rag_chunks` | content + page_number + `embedding vector(768)` + book_id |
| RPC `match_textbook_chunks` | بحث كوزايني سريع مع HNSW index، فلاتر صف / مادة / مرحلة |

## مهم

- الـ migration الذي يُنشئ هذه الجداول وملف pgvector: `supabase/migrations/<ts>_rag_textbook_system.sql`.
- إذا رأيت "(no matching textbook passages)" تأكّد:
  1. أن `GEMINI_API_KEY` موجود في `.env`.
  2. أنك ingestت كتاباً واحداً على الأقل لهذه المرحلة/الصف.
  3. أن الفلاتر (grade_number / subject_id) ليست مقيدة جداً.
