# Sizes for virtual machines in Azure

## VM size and series naming

### Name structure breakdown

| Category | Description | Links |
| --- | --- | --- |
| Type | Basic categorization by intended workload. | General purpose、Compute optimized、Memory optimized、Storage optimized、GPU accelerated、FPGA accelerated |
| Series | Group of sizes with similar hardware and features. | Enter the 'Series' tab here. |
| Size | Specific VM configuration, including vCPUs, memory, and accelerators. | Enter the 'Size' tab here. |

## List of VM size families by type

### General purpose

| Family | Workloads | Series List |
| --- | --- | --- |
| A-family | Entry-level economical | Av2-series、End of Life A-family series |
| B-family | Burstable | Bsv2-series、Basv2-series、Bpsv2-series、End of Life B-family series |
| D-family | Enterprise-grade applications、Relational databases、In-memory caching、Data analytics | Dsv7 and Ddsv7 series、Dlsv7 and Dldsv7 series、Dasv7 and Dadsv7 series、Dalsv7 and Daldsv7 series、Dpsv6 and Dplsv6-series、Dpdsv6 and Dpldsv6-series、Dasv6 and Dadsv6-series、Dalsv6 and Daldsv6-series、Dsv6 and Ddsv6-series、Dlsv6 and Dldsv6-series、Dpsv5 and Dpdsv5-series、Dplsv5 and Dpldsv5-series、Dlsv5 and Dldsv5-series、Dv5 and Dsv5-series、Ddv5 and Ddsv5-series、Dasv5 and Dadsv5-series、End of Life D-family series |
| DC-family | D-family with confidential computing | DCasv5 and DCadsv5-series、DCas_cc_v5 and DCads_cc_v5-series、DCesv6-series、DCedsv6-series、DCasv6 and DCadsv6-series、DCsv3 and DCdsv3-series、End of Life DC-family |

### Compute optimized

| Family | Workloads | Series List |
| --- | --- | --- |
| F-family | Medium traffic web servers、Network appliances、Batch processes、Application servers | Fasv7 and Fadsv7 series、Famsv7 and Famdsv7 series、Falsv7 and Faldsv7 series、Fasv6, Falsv6, and Famsv6-series、Fsv2-series、End of Life F-family |
| FX-family | Electronic Design Automation (EDA)、Large memory relational databases、Medium to large caches、In-memory analytics | FX-series、FXmsv2-series、FXmdsv2-series |

### Memory optimized

| Family | Workloads | Series List |
| --- | --- | --- |
| E-family | Relational databases、Medium to large caches、In-memory analytics | Esv7 and Edsv7-series、Easv7 and Eadsv7 series、Esv6 and Edsv6-series、Epsv6 and Epdsv6-series、Easv6 and Eadsv6-series、Ev5 and Esv5-series、Edv5 and Edsv5-series、Easv5 and Eadsv5-series、Epsv5 and Epdsv5-series、End of Life families |
| Eb-family | E-family with High remote storage performance | Ebsv6 and Ebdsv6-series、Ebdsv5 and Ebsv5-series |
| EC-family | E-family with confidential computing | ECasv6 and ECadsv6-series、ECasv5 and ECadsv5-series、ECas_cc_v5 and ECads_cc_v5-series |
| M-family | Extremely large databases、Large amounts of memory | Mbsv3 and Mbdsv3-series、Msv3 and Mdsv3 Medium Memory series、Msv3 and Mdsv3 High Memory series、Mdsv3 Very High Memory series、Msv2 and Mdsv2-series、Msv2 High Memory Series、M-series |
| Other families | Older generation memory optimized sizes | Dnsv6 and Dndsv6-series、Dnlsv6 and Dnldsv6-series、Ensv6 and Endsv6-series、End of Life families |

### Storage optimized

| Family | Workloads | Series List |
| --- | --- | --- |
| L-family | High disk throughput and IO、Big Data、SQL and NoSQL databases、Data warehousing、Large transactional databases | Laosv5-series、Lasv5-series、Lsv4-series、Lasv4-series、Laosv4-series、Lsv3-series、Lasv3-series、End of Life L-family |

### GPU accelerated

| Family | Workloads | Series List |
| --- | --- | --- |
| NC-family | Compute-intensive、Graphics-intensive、Visualization | NC_RTXPRO6000BSE_v6-series、NCads_H100_v5-series、NCCads_H100_v5-series、NCv3-series、NCasT4_v3-series、NC_A100_v4-series |
| ND-family | Large memory compute-intensive、Large memory graphics-intensive、Large memory visualization | ND GB300-v6-series、ND GB200-v6-series、ND_MI300X_v5-series、ND-H200-v5-series、ND-H100-v5-series、NDm_A100_v4-series、ND_A100_v4-series |
| NG-family | Virtual Desktop (VDI)、Cloud gaming | NGads V620-series |
| NV-family | Virtual desktop (VDI)、Single-precision compute、Video encoding and rendering | NV-series、NVv3-series、NVv4-series、NVadsA10_v5-series、NVads V710 v5-series、End of Life NV-family |

### FPGA accelerated

| Family | Workloads | Series List |
| --- | --- | --- |
| NP-family | Machine learning inference、Video transcoding、Database search and analytics | NP-series |

### High performance compute

| Family | Workloads | Series List |
| --- | --- | --- |
| HB-family | High memory bandwidth、Fluid Dynamics、Weather modeling | HBv2-series、HBv3-series、HBv4-series、HBv5-series |
| HC-family | High density compute、Finite element analysis、Molecular dynamics、Computational chemistry | HC-series (retiring May 31, 2027) |
| HX-family | Large memory capacity、Electronic Design Automation (EDA) | HX-series |
