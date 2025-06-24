# Solución Challenge Worldsys

## Idea general

Esta solución consiste en la implementación de dos servicios: una base de datos (SQL Server) y un backend (ExpressJs). Ambos servicios están listos para ser deployados en Kubernetes.

El servicio de backend, cuyo root es `/backend-challenge-file-ingestion/backend-server`, expone dos endpoints:

### `/processclients`

Recibe un POST request, procesa el archivo `CLIENTES_IN_0425.dat` y lo inserta en la base de datos.

### `/health`

Expone el endpoint de health del backend. Este endpoint se mantiene funcional independientemente del procesamiento realizado al archivo del input.

## Cómo correr esta implementación localmente en Minikube

1. Arrancar Minikube en caso de no tenerlo corriendo:

   ```bash
   minikube start
   ```

2. Asegurarse de que las imágenes de Docker se buildeen dentro del daemon interno de Docker en Minikube:

   ```bash
   eval $(minikube docker-env)
   ```

3. Buildear la imagen de la base de datos (desde el root del repo):

   ```bash
   docker build -t backend-challenge-file-ingestion-db:latest -f Dockerfile.db .
   ```

   Output esperado:

   ```bash
   [+] Building 0.3s (10/10) FINISHED                                                                                      docker:default
   => [internal] load build definition from Dockerfile.db                                                                           0.0s
   => => transferring dockerfile: 1.10kB                                                                                            0.0s
   => [internal] load .dockerignore                                                                                                 0.0s
   => => transferring context: 2B                                                                                                   0.0s
   => [internal] load metadata for mcr.microsoft.com/mssql/server:2022-latest                                                       0.0s
   => [1/5] FROM mcr.microsoft.com/mssql/server:2022-latest                                                                         0.0s
   => [internal] load build context                                                                                                 0.0s
   => => transferring context: 105B                                                                                                 0.0s
   => CACHED [2/5] RUN apt-get update && apt-get install -y curl gnupg apt-transport-https &&     curl https://packages.microsoft.  0.0s
   => CACHED [3/5] COPY ./init /init                                                                                                0.0s
   => CACHED [4/5] COPY ./init/entrypoint.sh /usr/src/entrypoint.sh                                                                 0.0s
   => CACHED [5/5] RUN chmod +x /usr/src/entrypoint.sh                                                                              0.0s
   => exporting to image                                                                                                            0.0s
   => => exporting layers                                                                                                           0.0s
   => => writing image sha256:19d19f8b8cc19d09f1f4ae1de7a779c7493b4c98be8c09a10e303755f69a32d6                                      0.0s
   => => naming to docker.io/library/backend-challenge-file-ingestion-db:latest                                                     0.0s
   ```

   Esta imagen usa `entrypoint.sh` y `create_table.sql` para crear la base de datos con la tabla pedida en el enunciado del challenge.

4. Buildear la imagen del backend (desde el root del repo):

   ```bash
   docker build -t backend-challenge-file-ingestion-backend:latest -f backend-server/Dockerfile backend-server
   ```

   Output esperado:

   ```bash
   [+] Building 4.3s (11/11) FINISHED                                                                                      docker:default
   => [internal] load .dockerignore                                                                                                 0.0s
   => => transferring context: 108B                                                                                                 0.0s
   => [internal] load build definition from Dockerfile                                                                              0.1s
   => => transferring dockerfile: 410B                                                                                              0.0s
   => [internal] load metadata for docker.io/library/node:18-alpine                                                                 0.0s
   => [1/6] FROM docker.io/library/node:18-alpine                                                                                   0.0s
   => [internal] load build context                                                                                                 0.0s
   => => transferring context: 5.46kB                                                                                               0.0s
   => CACHED [2/6] WORKDIR /app                                                                                                     0.0s
   => CACHED [3/6] COPY package*.json ./                                                                                            0.0s
   => CACHED [4/6] RUN npm install                                                                                                  0.0s
   => [5/6] COPY . .                                                                                                                0.1s
   => [6/6] RUN npm run build                                                                                                       3.6s
   => exporting to image                                                                                                            0.2s
   => => exporting layers                                                                                                           0.2s
   => => writing image sha256:77e2b4a73c321afd4cb0ab8bfa430a7d895046dd7d2258eea45ba273dd1273d3                                      0.0s
   => => naming to docker.io/library/backend-challenge-file-ingestion-backend:latest                                                0.0s
   ```

5. Montar el directorio de input donde está el archivo que vamos a leer:

   Para que el backend pueda acceder al archivo `CLIENTES_IN_0425.dat` es necesario exponer el directorio dentro de Minikube:

   ```bash
   minikube mount /home/amildie/backend-challenge-file-ingestion/data-generator/challenge/input:/input
   ```

   **Importante**: hay que usar el path absoluto del directorio donde está el archivo de input.

6. Deployear la base de datos a Kubernetes:

   ```bash
   kubectl apply -f k8s/db-deployment.yaml
   kubectl apply -f k8s/db-service.yaml
   ```

7. Deployear el backend a Kubernetes:

   ```bash
   kubectl apply -f k8s/backend-deployment.yaml
   kubectl apply -f k8s/backend-service.yaml
   ```

   Este es un buen momento para checkear el estado general de los pods, para corroborar que efectivamente estén corriendo sin complicaciones:

   ```bash
   kubectl get pods
   ```

   Output esperado:

   ```bash
   NAME                         READY   STATUS    RESTARTS   AGE
   backend-6dfd85884b-wnhn7     1/1     Running   0          105m
   sqlserver-5675555d8b-94zhq   1/1     Running   0          133m
   ```

8. Forwardear el puerto 3000 del backend:

   ```bash
   kubectl port-forward service/backend 3000:3000
   ```

   **Nota**: mantener esta terminal abierta durante las pruebas.

9. Monitorear los logs del backend:

   ```bash
   kubectl logs -f backend-6dfd85884b-wnhn7
   ```

10. Realizar el test:

    ```bash
    curl -X POST http://localhost:3000/processclients
    ```

    El output esperado de este endpoint es el siguiente:

    ```bash
    Batch 1/100 - Progress: 1.00% (1000/100000) - Inserted: 924, Errors: 76
    Batch 2/100 - Progress: 2.00% (2000/100000) - Inserted: 1856, Errors: 144
    Batch 3/100 - Progress: 3.00% (3000/100000) - Inserted: 2787, Errors: 213
    :                                :                                :
    :                                :                                :
    :                                :                                :
    Batch 98/100 - Progress: 98.00% (98000/100000) - Inserted: 91360, Errors: 6640
    Batch 99/100 - Progress: 99.00% (99000/100000) - Inserted: 92285, Errors: 6715
    Batch 100/100 - Progress: 100.00% (100000/100000) - Inserted: 93226, Errors: 6774
    Done. Total inserted: 93226, errors: 6774. Elapsed time: 131.68 seconds.
    ```

      El output experado del backend al haber terminado la ingestion es:


    ```bash
    [Worker] Inserting batch with 100 rows (600 parameters)
    [Worker] Inserting batch with 100 rows (600 parameters)
    [Worker] Inserting batch with 41 rows (246 parameters)
    Worker completed task: inserted=941, errors=59
    Shutting down worker pool...
    Message sent to main thread.
    Shutdown message received. Closing DB connection pool...
    Worker exited gracefully with code 0
    Worker exited with code 0
    Worker exited gracefully with code 0
    Worker exited with code 0
    Worker pool shutdown complete.
    ```

    Luego de realizar la ingestion de datos es posible modificar el archivo `CLIENTES_IN_0425.dat` y volver a ejecutar el endpoint para realizar tests con diferentes tipos de input.

    Durante la carga de los datos se puede acceder vía browser a `http://localhost:3000/health` para verificar que este endpoint funciona de manera responsiva mientras se ejecuta el proceso.

## Cómo funciona el backend-server internamente?

Este backend es un sistema de procesamiento en paralelo desarrollado en Node.js y Typescript. Está basado en un `WorkerPool` que distribuye tareas de procesamiento de datos a múltiples threads. Este componente actúa como un orquestador en el thread principal, gestionando la creación, asignación y shutdown de workers.

Cada worker es una instancia de `clientProcessor.js` en un thread independiente que procesa lotes de líneas de texto, las parsea, valida y realiza inserciones grupales en la base de datos. Dados los límites de recursos para los pods que menciona el enunciado, dejé la cantidad default de workers en 2.

Cuanto mayor sean los recursos del pod, mayor es la cantidad de workers que pueden utilizarse. La performance escala linealmente al incrementar el número de workers hasta cierto punto (>12 workers), donde el overhead de la base de datos pasa a ser un factor a tener en cuenta.

El uso de inserciones masivas y batchs de líneas en `clientProcessor.js` optimiza las operaciones de base de datos, mientras que el WorkerPool garantiza un uso eficiente de los workers y un cierre ordenado.