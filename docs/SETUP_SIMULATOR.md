# 🛠️ Guide de Configuration — Simulateur OPC UA Local

Ce guide explique comment installer et configurer un simulateur de serveur OPC UA local pour le développement. Cela vous permettra de tester la connexion `SCADA_MODE=OPCUA` sans avoir accès à l'équipement industriel réel.

Nous utiliserons **Prosys OPC UA Simulation Server**, un outil gratuit et multi-plateforme (Windows, macOS, Linux).

## Étape 1 : Téléchargement et Installation

1.  **Téléchargez** le serveur de simulation depuis le site officiel de Prosys :
    [https://www.prosysopc.com/products/opc-ua-simulation-server/](https://www.prosysopc.com/products/opc-ua-simulation-server/)

2.  **Installez** l'application en suivant les instructions pour votre système d'exploitation.

## Étape 2 : Lancement et Configuration du Simulateur

1.  **Lancez** le `Prosys OPC UA Simulation Server`.
2.  Vérifiez l'**Endpoint URL** affichée dans l'onglet "Status". Par défaut, elle est généralement `opc.tcp://localhost:53530/OPCUA/SimulationServer`. C'est cette URL que nous utiliserons.
3.  Dans l'onglet "Objects", vous pouvez voir l'arborescence des objets simulés. Vous pouvez naviguer dans `Objects > Simulation` pour trouver des variables qui changent dynamiquement (ex: `Counter`, `Random`). Faites un clic droit sur une variable et sélectionnez "Monitor" pour voir sa valeur en temps réel.
4.  **Notez le `NodeId`** d'une variable que vous souhaitez surveiller. Par exemple, pour la variable `Counter`, le `NodeId` est souvent `ns=5;i=1001`. Vous aurez besoin de cette information pour le mapping.

## Étape 3 : Configurer l'Application

1.  **Générez le mapping** : Assurez-vous d'avoir une première version du fichier de mapping en exécutant la commande :
    ```bash
    npm run generate:scada-map
    ```
    Cela crée le fichier `public/scada-mapping.json`.

2.  **Modifiez le mapping** : Ouvrez `public/scada-mapping.json` et modifiez la valeur de `scada_tag_candidate` pour un de vos équipements afin qu'elle corresponde au `NodeId` du simulateur que vous avez noté.

    **Exemple :**
    ```json
    // public/scada-mapping.json
    {
      "external_id": "TG1",
      "name": "Turbine à gaz 1",
      "scada_tag_candidate": "ns=5;i=1001", // <-- MODIFIÉ POUR CORRESPONDRE AU SIMULATEUR
      "source_file": "components.json"
    }
    ```

3.  **Configurez l'environnement** : Ouvrez ou créez le fichier `.env.local` à la racine de votre projet et configurez les variables suivantes :

    ```env
    # .env.local

    # Clé API pour la communication temps réel (obligatoire)
    ABLY_API_KEY="VOTRE_CLE_API_ABLY_ICI"

    # Mode de fonctionnement du backend SCADA: "DEMO" ou "OPCUA"
    SCADA_MODE=OPCUA

    # URL du serveur OPC UA (utilisée uniquement si SCADA_MODE=OPCUA)
    OPCUA_SERVER_URL="opc.tcp://localhost:53530/OPCUA/SimulationServer"
    ```

## Étape 4 : Lancer et Tester

1.  Assurez-vous que le **Prosys Simulation Server est en cours d'exécution**.
2.  Lancez votre application Tauri :
    ```bash
    npm run tauri dev
    ```

Si tout est configuré correctement, le backend Rust de Tauri se connectera à votre simulateur OPC UA local, lira la valeur de la variable que vous avez mappée, et la publiera sur Ably. Vous devriez voir cette valeur apparaître sur votre tableau de bord.
