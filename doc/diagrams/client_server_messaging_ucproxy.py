from diagrams import Diagram, Cluster
from diagrams.aws.compute import EC2
from diagrams.aws.database import RDS
from diagrams.aws.network import ELB
from diagrams.onprem.inmemory import Redis
from diagrams.programming.language import Nodejs
from diagrams.generic.device import Mobile
from diagrams.programming.language import Cpp
from diagrams.custom import Custom
from diagrams.onprem.compute import Server

# STEP 1
# - Mobile clients wants to connect to on-Premise Server
# >>
# STEP 2
# - Server register to Clound platform
# - server establishes a WebSocket connection
# >>
# STEP 3
# - Client ask loadbalancer to which Proxy to connect to
# - Client connects to correct Proxy
# >>

with Diagram("Client_Server_Messaging_Proxy", show=False, direction="TB"):
    mobileA = Mobile("ClientA\nid:A")
    mobileB = Mobile("ClientB\nid:B")
    serverA = Server("ServerA\nid:A")
    serverB = Server("ServerB\nid:B")

    with Cluster("Clound platform"):
        with Cluster("Loadbalancer"):
            loadbalancer = Nodejs("Loadbalancer")
        with Cluster("Proxy Pool"):
            proxy1 = Nodejs("Proxy1")
            proxy2 = Nodejs("Proxy2")
        redis = Redis("Connection/Load")
        loadbalancer >> redis
    proxy1 << serverA
    proxy2 << serverB
    redis << proxy1
    redis << proxy2

    mobileA >> loadbalancer
    mobileB >> loadbalancer

    mobileA >> proxy1
    mobileB >> proxy2

# Cons
# - Code maintanance: ~9000 lines of code to manage Server and Client connections in Proxy
# - Servies using Server connection (intercepting Server messages) must by part of Proxy code e.g. Usermanager, Metadirectory etc
# - Relative high CPU load because of message parsing because of ROSEMessage
