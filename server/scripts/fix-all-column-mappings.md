# Column Mapping Fixes Needed

## Tables with `name` (NOT NULL) + `title` (NULL)

These need BOTH columns populated:

1. **requirements** - has `name` NOT NULL, `title` NULL
   - Code uses: `title`
   - Fix: Insert into BOTH `name` and `title`

2. **risks** - ✅ FIXED
   
3. **constraints** - has `name` NOT NULL, `title` NULL
   - Code uses: `title`
   - Fix: Insert into BOTH `name` and `title`

4. **success_criteria** - has `name` NOT NULL, `title` NULL
   - Code uses: `title`
   - Fix: Insert into BOTH `name` and `title`

## Tables with special name columns

5. **quality_standards** - has `standard_name` NOT NULL, `title` NULL
   - Code uses: `title`
   - Fix: Insert into BOTH `standard_name` and `title`

6. **scope_items** - has `item_name` NOT NULL, `title` NULL
   - Code uses: `title`
   - Fix: Insert into BOTH `item_name` and `title`

7. **activities** - has `activity_name` NOT NULL, `name` NULL
   - Code uses: `name`
   - Fix: Insert into BOTH `activity_name` and `name`

