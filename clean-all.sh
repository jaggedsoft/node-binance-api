#!/bin/bash
#
# make clean and rm all the targetted executables.

rm cpuminer-avx512-sha-vaes cpuminer-avx512-sha cpuminer-avx512 cpuminer-avx2 cpuminer-avx cpuminer-aes-sse42 cpuminer-sse2 cpuminer-zen cpuminer-sse42 cpuminer-ssse3 cpuminer-zen3 > /dev/null

rm cpuminer-avx512-sha-vaes.exe cpuminer-avx512-sha.exe cpuminer-avx512.exe cpuminer-avx2.exe cpuminer-avx.exe cpuminer-aes-sse42.exe cpuminer-sse2.exe cpuminer-zen.exe  cpuminer-sse42.exe cpuminer-ssse3.exe cpuminer-zen3.exe > /dev/null

make distclean > /dev/null
