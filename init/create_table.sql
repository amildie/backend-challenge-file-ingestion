IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'ClientesDB')
BEGIN
    CREATE DATABASE ClientesDB;
END
GO

USE ClientesDB;
GO

IF OBJECT_ID('Clientes', 'U') IS NOT NULL
BEGIN
    DROP TABLE Clientes;
END
GO

CREATE TABLE Clientes (
    NombreCompleto NVARCHAR(100) NOT NULL,
    DNI BIGINT NOT NULL,
    Estado VARCHAR(10) NOT NULL,
    FechaIngreso DATE NOT NULL,
    EsPEP BIT NOT NULL,
    EsSujetoObligado BIT NULL,
    FechaCreacion DATETIME NOT NULL DEFAULT GETDATE()
);
GO

-- some test clients
INSERT INTO Clientes (NombreCompleto, DNI, Estado, FechaIngreso, EsPEP, EsSujetoObligado)
VALUES
('María Gómez',       45678901, 'Activo',   '2021-11-13', 1, 0),
('Carlos Pérez',      32165498, 'Inactivo', '2020-06-20', 0, 1),
('Lucía Fernández',   35467890, 'Activo',   '2019-02-01', 0, 0),
('Juan Martínez',     29876543, 'Activo',   '2018-09-15', 0, 1),
('Laura Rodríguez',   38765432, 'Inactivo', '2022-01-30', 1, NULL),
('Diego Suárez',      31234567, 'Activo',   '2020-12-25', 1, 1),
('Natalia Torres',    39998888, 'Activo',   '2021-05-12', 0, 0),
('Ricardo López',     33445566, 'Inactivo', '2019-07-04', 0, 1),
('Florencia Ibáñez',  37778888, 'Activo',   '2023-03-03', 1, 1),
('Tomás Herrera',     38889999, 'Activo',   '2024-01-01', 0, 0);
GO
