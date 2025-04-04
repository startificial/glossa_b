# Database Reset Tool

This tool allows you to reset the application database while preserving the demo user account. Use this when you want to start with a clean slate but still be able to log in.

## What the tool does

When you run the database reset tool, it will:

1. **Preserve** the following data:
   - Demo user account (username: `demo`, password: `password`)

2. **Remove** the following data:
   - All customers
   - All projects
   - All input data (PDF uploads, etc.)
   - All requirements
   - All activities
   - All implementation tasks
   - All invites

3. **Reset** all ID sequences to start from 1 again

## Usage

To reset the database, run the following command in the terminal:

```bash
node reset-db.mjs
```

You will be prompted to confirm the reset operation:

```
🗑️  Database Reset Tool 🗑️
--------------------------------------
This will clear all application data while preserving the demo user account.
The following data will be removed:
  - All customers
  - All projects
  - All input data (PDF uploads, etc.)
  - All requirements
  - All activities
  - All implementation tasks
  - All invites

The demo user account will be preserved for login.

⚠️  Are you sure you want to continue? (yes/no):
```

Type `yes` and press Enter to proceed with the reset.

## After Reset

After the reset is complete, you should restart the application using the "Start application" workflow. Once restarted, you will have a clean database with only the demo user preserved.

## Troubleshooting

If you encounter any issues during the reset process:

1. Check that the `DATABASE_URL` environment variable is properly set.
2. Verify that the Postgres database is running and accessible.
3. Check the logs for specific error messages.

If errors persist, you can manually execute the SQL commands to reset the database:

```sql
DELETE FROM implementation_tasks;
DELETE FROM activities;
DELETE FROM requirements;
DELETE FROM input_data;
DELETE FROM projects;
DELETE FROM customers;
DELETE FROM invites;

ALTER SEQUENCE implementation_tasks_id_seq RESTART WITH 1;
ALTER SEQUENCE activities_id_seq RESTART WITH 1;
ALTER SEQUENCE requirements_id_seq RESTART WITH 1;
ALTER SEQUENCE input_data_id_seq RESTART WITH 1;
ALTER SEQUENCE projects_id_seq RESTART WITH 1;
ALTER SEQUENCE customers_id_seq RESTART WITH 1;
ALTER SEQUENCE invites_id_seq RESTART WITH 1;
```