#!/bin/bash
/opt/mssql/bin/sqlservr &

echo "Waiting for SQL Server..."
for i in {1..60}; do
    /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P 'Str0ngPass!123' -Q "SELECT 1" &> /dev/null && break
    sleep 1
done

echo "Running init script..."
/opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P 'Str0ngPass!123' -i /init/create_table.sql

wait
