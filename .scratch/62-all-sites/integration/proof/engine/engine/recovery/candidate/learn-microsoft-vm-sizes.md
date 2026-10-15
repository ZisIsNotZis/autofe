# Sizes for virtual machines in Azure

Applies to: ✔️ Linux VMs ✔️ Windows VMs ✔️ Flexible scale sets ✔️ Uniform scale sets

Azure Virtual Machine (VM) sizes are designed to provide a wide range of options for hosting your servers and their workloads in the cloud. Sizes are categorized into different families and types, each optimized for specific purposes. Users can choose the most suitable VM size based on their requirements, such as CPU, memory, storage, and network bandwidth.

This article describes what sizes are, gives an overview of the available sizes and shows different options for Azure virtual machine instances you can use to run your apps and workloads.

图片: ![YouTube video for selecting the right size for your VM.](../assets/62-learn-microsoft-vm-sizes-46d4bcfd2844.png)

## VM size and series naming

Azure VM sizes follow specific naming conventions to denote varying features and specifications. Each character in the name represents different aspects of the VM. These include the VM family, number of vCPUs, and extra features like premium storage or included accelerators.

VM naming is further broken down into the 'Series' name and the 'Size' name. Size names include extra characters representing the number of vCPUs, type of storage, etc.

| Category | Description | Links |
| --- | --- | --- |
| Type | Basic categorization by intended workload. | General purpose、Compute optimized、Memory optimized、Storage optimized、GPU accelerated、FPGA accelerated |
| Series | Group of sizes with similar hardware and features. | Enter the 'Series' tab here. |
| Size | Specific VM configuration, including vCPUs, memory, and accelerators. | Enter the 'Size' tab here. |

#### Type

[General purpose](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/overview?tabs=breakdownseries%2Cgeneralsizelist%2Ccomputesizelist%2Cmemorysizelist%2Cstoragesizelist%2Cgpusizelist%2Cfpgasizelist%2Chpcsizelist#general-purpose) [Compute optimized](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/overview?tabs=breakdownseries%2Cgeneralsizelist%2Ccomputesizelist%2Cmemorysizelist%2Cstoragesizelist%2Cgpusizelist%2Cfpgasizelist%2Chpcsizelist#compute-optimized) [Memory optimized](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/overview?tabs=breakdownseries%2Cgeneralsizelist%2Ccomputesizelist%2Cmemorysizelist%2Cstoragesizelist%2Cgpusizelist%2Cfpgasizelist%2Chpcsizelist#memory-optimized) [Storage optimized](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/overview?tabs=breakdownseries%2Cgeneralsizelist%2Ccomputesizelist%2Cmemorysizelist%2Cstoragesizelist%2Cgpusizelist%2Cfpgasizelist%2Chpcsizelist#storage-optimized) [GPU accelerated](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/overview?tabs=breakdownseries%2Cgeneralsizelist%2Ccomputesizelist%2Cmemorysizelist%2Cstoragesizelist%2Cgpusizelist%2Cfpgasizelist%2Chpcsizelist#gpu-accelerated) [FPGA accelerated](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/overview?tabs=breakdownseries%2Cgeneralsizelist%2Ccomputesizelist%2Cmemorysizelist%2Cstoragesizelist%2Cgpusizelist%2Cfpgasizelist%2Chpcsizelist#fpga-accelerated)

#### Series

[Enter the 'Series' tab here.](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/overview?tabs=breakdownseries%2Cgeneralsizelist%2Ccomputesizelist%2Cmemorysizelist%2Cstoragesizelist%2Cgpusizelist%2Cfpgasizelist%2Chpcsizelist#name-structure-breakdown)

#### Size

[Enter the 'Size' tab here.](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/overview?tabs=breakdownseries%2Cgeneralsizelist%2Ccomputesizelist%2Cmemorysizelist%2Cstoragesizelist%2Cgpusizelist%2Cfpgasizelist%2Chpcsizelist#name-structure-breakdown)

### Name structure breakdown

Here's a breakdown of a 'General purpose, DCads_v5-series' size series.

1 Most families are represented using one letter, but others such as GPU sizes (ND-series, NV-series, etc.) use two. 2 Most subfamilies are represented with a single upper case letter, but others (such as Ebsv5-series) are still considered subfamilies of their parent family due to feature differences. 3 If no feature letter for a CPU is listed, the series uses Intel x86-64 CPUs. If the CPU is AMD, it's listed as a. If the CPU is ARM based (Microsoft Cobalt or Ampere Altra), it's listed as p. 4 There can be any number of extra features in a size name. There could be none (Dv5-series) or there could be three (Dplds_v6-series). 5 Version numbers only appear in the size name if there are multiple versions of the same series. If you're using the first version of a series (HB-series, B-series, etc.) it's often not included in the size name.

图片: ![Graphic showing a breakdown of the DCadsv5 VM size series with text describing each letter and section of the name.](../assets/62-learn-microsoft-vm-sizes-a4669a60fcd7.png)

Note

Not all sizes will have subfamilies, support accelerators, or specify the CPU vendor. For more information on VM size naming conventions, see Azure VM sizes naming conventions.

[Azure VM sizes naming conventions](https://learn.microsoft.com/en-us/azure/virtual-machines/vm-naming-conventions)

## List of VM size families by type

This section contains a list of all current generation size series with tabs dedicated to each size family. Each group has a 'Series List' column with a linked list of all available size series, These links will bring you to the family page for that series, where you can find detailed information on each size in that series or go to the series' page for a list of sizes in that series.

To learn more about a size family, select the 'family' tab under each type section. There you can read a summary on the family, see the workloads it's recommended for, and view the full family page with specifications for all series in that family.

### General purpose

General purpose VM sizes provide balanced CPU-to-memory ratio. Ideal for testing and development, small to medium databases, and low to medium traffic web servers.

| Family | Workloads | Series List |
| --- | --- | --- |
| A-family | Entry-level economical | Av2-series、End of Life A-family series |
| B-family | Burstable | Bsv2-series、Basv2-series、Bpsv2-series、End of Life B-family series |
| D-family | Enterprise-grade applications、Relational databases、In-memory caching、Data analytics | Dsv7 and Ddsv7 series、Dlsv7 and Dldsv7 series、Dasv7 and Dadsv7 series、Dalsv7 and Daldsv7 series、Dpsv6 and Dplsv6-series、Dpdsv6 and Dpldsv6-series、Dasv6 and Dadsv6-series、Dalsv6 and Daldsv6-series、Dsv6 and Ddsv6-series、Dlsv6 and Dldsv6-series、Dpsv5 and Dpdsv5-series、Dplsv5 and Dpldsv5-series、Dlsv5 and Dldsv5-series、Dv5 and Dsv5-series、Ddv5 and Ddsv5-series、Dasv5 and Dadsv5-series、End of Life D-family series |
| DC-family | D-family with confidential computing | DCasv5 and DCadsv5-series、DCas_cc_v5 and DCads_cc_v5-series、DCesv6-series、DCedsv6-series、DCasv6 and DCadsv6-series、DCsv3 and DCdsv3-series、End of Life DC-family |

##### A-family

[A-family](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/general-purpose/a-family) [Av2-series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/general-purpose/a-family#av2-series) [End of Life A-family series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/lifecycle/end-of-life-sizes-list#general-purpose-end-of-life-sizes)

##### B-family

[B-family](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/general-purpose/b-family) [Bsv2-series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/general-purpose/b-family#bsv2-series) [Basv2-series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/general-purpose/b-family#basv2-series) [Bpsv2-series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/general-purpose/b-family#bpsv2-series) [End of Life B-family series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/lifecycle/end-of-life-sizes-list#general-purpose-end-of-life-sizes)

##### D-family

[D-family](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/general-purpose/d-family) [Dsv7 and Ddsv7 series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/general-purpose/d-family#dsv7-series-and-ddsv7-series) [Dlsv7 and Dldsv7 series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/general-purpose/d-family#dlsv7-series-and-dldsv7-series) [Dasv7 and Dadsv7 series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/general-purpose/d-family#dasv7-series-and-dadsv7-series) [Dalsv7 and Daldsv7 series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/general-purpose/d-family#dalsv7-series-and-daldsv7-series) [Dpsv6 and Dplsv6-series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/general-purpose/d-family#dpsv6-and-dplsv6-series) [Dpdsv6 and Dpldsv6-series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/general-purpose/d-family#dpdsv6-and-dpldsv6-series) [Dasv6 and Dadsv6-series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/general-purpose/d-family#dasv6-and-dadsv6-series) [Dalsv6 and Daldsv6-series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/general-purpose/d-family#dalsv6-and-daldsv6-series) [Dsv6 and Ddsv6-series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/general-purpose/dsv6-series) [Dlsv6 and Dldsv6-series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/general-purpose/dlsv6-series) [Dpsv5 and Dpdsv5-series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/general-purpose/d-family#dpsv5-and-dpdsv5-series) [Dplsv5 and Dpldsv5-series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/general-purpose/d-family#dplsv5-and-dpldsv5-series) [Dlsv5 and Dldsv5-series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/general-purpose/d-family#dlsv5-and-dldsv5-series) [Dv5 and Dsv5-series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/general-purpose/d-family#dv5-and-dsv5-series) [Ddv5 and Ddsv5-series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/general-purpose/d-family#ddv5-and-ddsv5-series) [Dasv5 and Dadsv5-series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/general-purpose/d-family#dasv5-and-dadsv5-series) [End of Life D-family series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/lifecycle/end-of-life-sizes-list#general-purpose-end-of-life-sizes)

##### DC-family

[DC-family](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/general-purpose/dc-family) [DCasv5 and DCadsv5-series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/general-purpose/dc-family#dcasv5-and-dcadsv5-series) [DCas_cc_v5 and DCads_cc_v5-series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/general-purpose/dc-family#dcas_cc_v5-and-dcads_cc_v5-series) [DCesv6-series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/general-purpose/dc-family#dcesv6-series) [DCedsv6-series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/general-purpose/dcedsv6-series) [DCasv6 and DCadsv6-series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/general-purpose/dc-family#dcasv6-and-dcadsv6-series) [DCsv3 and DCdsv3-series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/general-purpose/dc-family#dcsv3-and-dcdsv3-series) [End of Life DC-family](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/lifecycle/end-of-life-sizes-list#general-purpose-end-of-life-sizes)

### Compute optimized

Compute optimized VM sizes have a high CPU-to-memory ratio. These sizes are good for medium traffic web servers, network appliances, batch processes, and application servers.

List of compute optimized VM size families:

To learn more about a specific size family or series, select the tab for that family and scroll to find your desired size series.

| Family | Workloads | Series List |
| --- | --- | --- |
| F-family | Medium traffic web servers、Network appliances、Batch processes、Application servers | Fasv7 and Fadsv7 series、Famsv7 and Famdsv7 series、Falsv7 and Faldsv7 series、Fasv6, Falsv6, and Famsv6-series、Fsv2-series、End of Life F-family |
| FX-family | Electronic Design Automation (EDA)、Large memory relational databases、Medium to large caches、In-memory analytics | FX-series、FXmsv2-series、FXmdsv2-series |

##### F-family

[F-family](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/compute-optimized/f-family) [Fasv7 and Fadsv7 series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/compute-optimized/f-family#fasv7-series-and-fadsv7-series) [Famsv7 and Famdsv7 series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/compute-optimized/f-family#famsv7-series-and-famdsv7-series) [Falsv7 and Faldsv7 series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/compute-optimized/f-family#falsv7-series-and-faldsv7-series) [Fasv6, Falsv6, and Famsv6-series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/compute-optimized/f-family#fasv6-falsv6-and-famsv6-series) [Fsv2-series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/compute-optimized/f-family#fsv2-series) [End of Life F-family](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/lifecycle/end-of-life-sizes-list#compute-optimized-end-of-life-sizes)

##### FX-family

[FX-family](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/compute-optimized/fx-family) [FX-series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/compute-optimized/fx-family#fx-series) [FXmsv2-series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/compute-optimized/fxmsv2-series) [FXmdsv2-series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/compute-optimized/fxmdsv2-series)

### Memory optimized

Memory optimized VM sizes offer a high memory-to-CPU ratio that is great for relational database servers, medium to large caches, and in-memory analytics.

List of memory optimized VM sizes with links to each series' family page section:

To learn more about a specific size family or series, select the tab for that family and scroll to find your desired size series.

| Family | Workloads | Series List |
| --- | --- | --- |
| E-family | Relational databases、Medium to large caches、In-memory analytics | Esv7 and Edsv7-series、Easv7 and Eadsv7 series、Esv6 and Edsv6-series、Epsv6 and Epdsv6-series、Easv6 and Eadsv6-series、Ev5 and Esv5-series、Edv5 and Edsv5-series、Easv5 and Eadsv5-series、Epsv5 and Epdsv5-series、End of Life families |
| Eb-family | E-family with High remote storage performance | Ebsv6 and Ebdsv6-series、Ebdsv5 and Ebsv5-series |
| EC-family | E-family with confidential computing | ECasv6 and ECadsv6-series、ECasv5 and ECadsv5-series、ECas_cc_v5 and ECads_cc_v5-series |
| M-family | Extremely large databases、Large amounts of memory | Mbsv3 and Mbdsv3-series、Msv3 and Mdsv3 Medium Memory series、Msv3 and Mdsv3 High Memory series、Mdsv3 Very High Memory series、Msv2 and Mdsv2-series、Msv2 High Memory Series、M-series |
| Other families | Older generation memory optimized sizes | Dnsv6 and Dndsv6-series、Dnlsv6 and Dnldsv6-series、Ensv6 and Endsv6-series、End of Life families |

##### E-family

[E-family](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/memory-optimized/e-family) [Esv7 and Edsv7-series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/memory-optimized/e-family#esv7-and-edsv7-series) [Easv7 and Eadsv7 series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/memory-optimized/e-family#easv7-series-and-eadsv7-series) [Esv6 and Edsv6-series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/memory-optimized/esv6-series) [Epsv6 and Epdsv6-series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/memory-optimized/e-family#epsv6-and-epdsv6-series) [Easv6 and Eadsv6-series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/memory-optimized/e-family#easv6-and-eadsv6-series) [Ev5 and Esv5-series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/memory-optimized/e-family#ev5-and-esv5-series) [Edv5 and Edsv5-series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/memory-optimized/e-family#edv5-and-edsv5-series) [Easv5 and Eadsv5-series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/memory-optimized/e-family#easv5-and-eadsv5-series) [Epsv5 and Epdsv5-series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/memory-optimized/e-family#epsv5-and-epdsv5-series) [End of Life families](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/lifecycle/end-of-life-sizes-list#memory-optimized-end-of-life-sizes)

##### Eb-family

[Eb-family](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/memory-optimized/eb-family) [Ebsv6 and Ebdsv6-series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/memory-optimized/eb-family#ebsv6-and-ebdsv6-series) [Ebdsv5 and Ebsv5-series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/memory-optimized/eb-family#ebdsv5-and-ebsv5-series)

##### EC-family

[EC-family](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/memory-optimized/ec-family) [ECasv6 and ECadsv6-series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/memory-optimized/ec-family#ecasv6-and-ecadsv6-series) [ECasv5 and ECadsv5-series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/memory-optimized/ec-family#ecasv5-and-ecadsv5-series) [ECas_cc_v5 and ECads_cc_v5-series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/memory-optimized/ec-family#ecas_ccv5-and-ecads_ccv5-series)

##### M-family

[M-family](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/memory-optimized/m-family) [Mbsv3 and Mbdsv3-series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/memory-optimized/m-family#mbsv3-and-mbdsv3-series) [Msv3 and Mdsv3 Medium Memory series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/memory-optimized/m-family#msv3-and-mdsv3-medium-memory-series) [Msv3 and Mdsv3 High Memory series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/memory-optimized/m-family#msv3-and-mdsv3-high-memory-series) [Mdsv3 Very High Memory series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/memory-optimized/m-family#mdsv3-very-high-memory-series) [Msv2 and Mdsv2-series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/memory-optimized/m-family#msv2-and-mdsv2-medium-memory-series) [Msv2 High Memory Series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/memory-optimized/m-family#msv2-high-memory-series) [M-series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/memory-optimized/m-family#m-series)

##### Other families

[Dnsv6 and Dndsv6-series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/memory-optimized/dnsv6-series) [Dnlsv6 and Dnldsv6-series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/memory-optimized/dnlsv6-series) [Ensv6 and Endsv6-series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/memory-optimized/ensv6-series) [End of Life families](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/lifecycle/end-of-life-sizes-list#memory-optimized-end-of-life-sizes)

### Storage optimized

Storage optimized virtual machine (VM) sizes offer high disk throughput and IO, and are ideal for Big Data, SQL, NoSQL databases, data warehousing, and large transactional databases. Examples include Cassandra, MongoDB, Cloudera, and Redis.

List of storage optimized VM size families:

To learn more about a specific size family or series, select the tab for that family and scroll to find your desired size series.

| Family | Workloads | Series List |
| --- | --- | --- |
| L-family | High disk throughput and IO、Big Data、SQL and NoSQL databases、Data warehousing、Large transactional databases | Laosv5-series、Lasv5-series、Lsv4-series、Lasv4-series、Laosv4-series、Lsv3-series、Lasv3-series、End of Life L-family |

##### L-family

[L-family](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/storage-optimized/l-family) [Laosv5-series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/storage-optimized/laosv5-series) [Lasv5-series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/storage-optimized/lasv5-series) [Lsv4-series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/storage-optimized/lsv4-series) [Lasv4-series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/storage-optimized/lasv4-series) [Laosv4-series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/storage-optimized/laosv4-series) [Lsv3-series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/storage-optimized/l-family#lsv3-series) [Lasv3-series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/storage-optimized/l-family#lasv3-series) [End of Life L-family](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/lifecycle/end-of-life-sizes-list#storage-optimized-end-of-life-sizes)

### GPU accelerated

GPU optimized VM sizes are specialized virtual machines available with single, multiple, or fractional GPUs. These sizes are designed for compute-intensive, graphics-intensive, and visualization workloads.

List of GPU optimized VM size families:

To learn more about a specific size family or series, select the tab for that family and scroll to find your desired size series.

| Family | Workloads | Series List |
| --- | --- | --- |
| NC-family | Compute-intensive、Graphics-intensive、Visualization | NC_RTXPRO6000BSE_v6-series、NCads_H100_v5-series、NCCads_H100_v5-series、NCv3-series、NCasT4_v3-series、NC_A100_v4-series |
| ND-family | Large memory compute-intensive、Large memory graphics-intensive、Large memory visualization | ND GB300-v6-series、ND GB200-v6-series、ND_MI300X_v5-series、ND-H200-v5-series、ND-H100-v5-series、NDm_A100_v4-series、ND_A100_v4-series |
| NG-family | Virtual Desktop (VDI)、Cloud gaming | NGads V620-series |
| NV-family | Virtual desktop (VDI)、Single-precision compute、Video encoding and rendering | NV-series、NVv3-series、NVv4-series、NVadsA10_v5-series、NVads V710 v5-series、End of Life NV-family |

##### NC-family

[NC-family](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/gpu-accelerated/nc-family) [NC_RTXPRO6000BSE_v6-series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/gpu-accelerated/nc-rtxpro6000-bse-v6-series) [NCads_H100_v5-series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/gpu-accelerated/nc-family#ncads_h100_v5-series) [NCCads_H100_v5-series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/gpu-accelerated/nc-family#nccads_h100_v5-series) [NCv3-series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/gpu-accelerated/nc-family#ncv3-series) [NCasT4_v3-series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/gpu-accelerated/nc-family#ncast4_v3-series) [NC_A100_v4-series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/gpu-accelerated/nc-family#nc_a100_v4-series)

##### ND-family

[ND-family](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/gpu-accelerated/nd-family) [ND GB300-v6-series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/gpu-accelerated/nd-gb300-v6-series) [ND GB200-v6-series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/gpu-accelerated/nd-gb200-v6-series) [ND_MI300X_v5-series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/gpu-accelerated/nd-family#nd_mi300x_v5-series) [ND-H200-v5-series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/gpu-accelerated/nd-h200-v5-series) [ND-H100-v5-series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/gpu-accelerated/nd-family#nd_h100_v5-series) [NDm_A100_v4-series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/gpu-accelerated/nd-family#ndm_a100_v4-series) [ND_A100_v4-series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/gpu-accelerated/nd-family#nd_a100_v4-series)

##### NG-family

[NG-family](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/gpu-accelerated/ng-family) [NGads V620-series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/gpu-accelerated/ng-family#ngads-v620-series)

##### NV-family

[NV-family](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/gpu-accelerated/nv-family) [NV-series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/gpu-accelerated/nv-family#nv-series-v1) [NVv3-series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/gpu-accelerated/nv-family#nvv3-series) [NVv4-series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/gpu-accelerated/nv-family#nvv4-series) [NVadsA10_v5-series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/gpu-accelerated/nv-family#nvads-a10-v5-series) [NVads V710 v5-series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/gpu-accelerated/nvadsv710-v5-series) [End of Life NV-family](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/lifecycle/end-of-life-sizes-list#gpu-accelerated-end-of-life-sizes)

### FPGA accelerated

FPGA optimized VM sizes are specialized virtual machines available with single or multiple FPGAs. These sizes are designed for compute-intensive workloads. This article provides information about the number and type of FPGAs, vCPUs, data disks, and NICs. Storage throughput and network bandwidth are also included for each size in this grouping.

List of field programmable gate array accelerated VM size families:

To learn more about a specific size family or series, select the tab for that family and scroll to find your desired size series.

| Family | Workloads | Series List |
| --- | --- | --- |
| NP-family | Machine learning inference、Video transcoding、Database search and analytics | NP-series |

##### NP-family

[NP-family](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/fpga-accelerated/np-family) [NP-series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/fpga-accelerated/np-family#np-series)

### High performance compute

Azure High Performance Compute VMs are optimized for various HPC workloads such as computational fluid dynamics, finite element analysis, frontend and backend EDA, rendering, molecular dynamics, computational geoscience, weather simulation, and financial risk analysis.

List of high performance computing optimized VM size families:

To learn more about a specific size family or series, select the tab for that family and scroll to find your desired size series.

| Family | Workloads | Series List |
| --- | --- | --- |
| HB-family | High memory bandwidth、Fluid Dynamics、Weather modeling | HBv2-series、HBv3-series、HBv4-series、HBv5-series |
| HC-family | High density compute、Finite element analysis、Molecular dynamics、Computational chemistry | HC-series (retiring May 31, 2027) |
| HX-family | Large memory capacity、Electronic Design Automation (EDA) | HX-series |

##### HB-family

[HB-family](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/high-performance-compute/hb-family) [HBv2-series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/high-performance-compute/hbv2-series) [HBv3-series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/high-performance-compute/hbv3-series) [HBv4-series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/high-performance-compute/hbv4-series) [HBv5-series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/high-performance-compute/hbv5-series)

##### HC-family

[HC-family](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/high-performance-compute/hc-family) [HC-series (retiring May 31, 2027)](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/high-performance-compute/hc-series)

##### HX-family

[HX-family](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/high-performance-compute/hx-family) [HX-series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/high-performance-compute/hx-series)

Note

HC-series (Standard_HC44rs, Standard_HC44-16rs, Standard_HC44-32rs) will be retired on May 31, 2027. After this date, remaining HC-series VMs will be deallocated, stop running, and will no longer have SLA or support. Sales of 1-year and 3-year Reserved Instances for HC-series ended on April 2, 2026. For new deployments, consider HBv5-series for higher performance and price-performance, or HX-series for high-memory HPC workloads.

[HBv5-series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/high-performance-compute/hbv5-series) [HX-series](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/high-performance-compute/hx-series)

## List available machine sizes by region.

The Azure CLI can be leveraged to identify which machine sizes are available for a particular region using the command:

az vm list-skus --location &lt;region&gt; --output table

## Learn platform sizes content

For information about pricing of the various sizes, see the pricing pages for Linux or Windows.

[Linux](https://azure.microsoft.com/pricing/details/virtual-machines/#Linux) [Windows](https://azure.microsoft.com/pricing/details/virtual-machines/Windows/#Windows)

Want to change the size of your VM? See Change the size of a VM.

[Change the size of a VM](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/resize-vm)

For availability of VM sizes in Azure regions, see Products available by region.

[Products available by region](https://azure.microsoft.com/regions/services/)

To see general limits on Azure VMs, see Azure subscription and service limits, quotas, and constraints.

[Azure subscription and service limits, quotas, and constraints](https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/azure-subscription-service-limits)

For more information on how Azure names its VMs, see Azure virtual machine sizes naming conventions.

[Azure virtual machine sizes naming conventions](https://learn.microsoft.com/en-us/azure/virtual-machines/vm-naming-conventions)

## REST API

For information on using the REST API to query for VM sizes, see the following:

List available virtual machine sizes for resizing

[List available virtual machine sizes for resizing](https://learn.microsoft.com/en-us/rest/api/compute/virtualmachines/listavailablesizes)

List available virtual machine sizes for a subscription

[List available virtual machine sizes for a subscription](https://learn.microsoft.com/en-us/rest/api/compute/resourceskus/list)

List available virtual machine sizes in an availability set

[List available virtual machine sizes in an availability set](https://learn.microsoft.com/en-us/rest/api/compute/availabilitysets/listavailablesizes)

## Benchmark scores

Learn more about compute performance for Linux VMs using the CoreMark benchmark scores.

[CoreMark benchmark scores](https://learn.microsoft.com/en-us/azure/virtual-machines/linux/compute-benchmark-scores)

Learn more about compute performance for Windows VMs using the SPECInt benchmark scores.

[SPECInt benchmark scores](https://learn.microsoft.com/en-us/azure/virtual-machines/windows/compute-benchmark-scores)

## Other size information

List of all available sizes: Sizes

[Sizes](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes)

Pricing Calculator: Pricing Calculator

[Pricing Calculator](https://azure.microsoft.com/pricing/calculator/)

Information on Disk Types: Disk Types

[Disk Types](https://learn.microsoft.com/en-us/azure/virtual-machines/disks-types)

## Next steps

Take advantage of the latest performance and features available for your workloads by changing the size of a virtual machine.

[changing the size of a virtual machine](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/resize-vm)

Utilize Microsoft's in-house designed ARM processors with Azure Cobalt VMs.

[Azure Cobalt VMs](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/cobalt-overview)

Learn how to Monitor Azure virtual machines.

[Monitor Azure virtual machines](https://learn.microsoft.com/en-us/azure/virtual-machines/monitor-vm)
