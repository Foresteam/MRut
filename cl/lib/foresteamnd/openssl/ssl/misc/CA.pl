#!/usr/bin/env perl
# Copyright 2000-2021 The OpenSSL Project Authors. All Rights Reserved.
#
# Licensed under the Apache License 2.0 (the "License").  You may not use
# this file except in compliance with the License.  You can obtain a copy
# in the file LICENSE in the source distribution or at
# https://www.openssl.org/source/license.html

#
# Wrapper around the ca to make it easier to use
#
# WARNING: do not edit!
# Generated by makefile from apps\CA.pl.in

use strict;
use warnings;

my $verbose = 1;
my @OPENSSL_CMDS = ("req", "ca", "pkcs12", "x509", "verify");

my $openssl = $ENV{'OPENSSL'} // "openssl";
$ENV{'OPENSSL'} = $openssl;
my $OPENSSL_CONFIG = $ENV{"OPENSSL_CONFIG"} // "";

# Command invocations.
my $REQ = "$openssl req $OPENSSL_CONFIG";
my $CA = "$openssl ca $OPENSSL_CONFIG";
my $VERIFY = "$openssl verify";
my $X509 = "$openssl x509";
my $PKCS12 = "$openssl pkcs12";

# Default values for various configuration settings.
my $CATOP = "./demoCA";
my $CAKEY = "cakey.pem";
my $CAREQ = "careq.pem";
my $CACERT = "cacert.pem";
my $CACRL = "crl.pem";
my $DAYS = "-days 365";
my $CADAYS = "-days 1095";	# 3 years
my $EXTENSIONS = "-extensions v3_ca";
my $POLICY = "-policy policy_anything";
my $NEWKEY = "newkey.pem";
my $NEWREQ = "newreq.pem";
my $NEWCERT = "newcert.pem";
my $NEWP12 = "newcert.p12";

# Commandline parsing
my %EXTRA;
my $WHAT = shift @ARGV || "";
@ARGV = parse_extra(@ARGV);
my $RET = 0;

# Split out "-extra-CMD value", and return new |@ARGV|. Fill in
# |EXTRA{CMD}| with list of values.
sub parse_extra
{
    foreach ( @OPENSSL_CMDS ) {
        $EXTRA{$_} = '';
    }

    my @result;
    while ( scalar(@_) > 0 ) {
        my $arg = shift;
        if ( $arg !~ m/-extra-([a-z0-9]+)/ ) {
            push @result, $arg;
            next;
        }
        $arg =~ s/-extra-//;
        die("Unknown \"-${arg}-extra\" option, exiting")
            unless scalar grep { $arg eq $_ } @OPENSSL_CMDS;
        $EXTRA{$arg} .= " " . shift;
    }
    return @result;
}


# See if reason for a CRL entry is valid; exit if not.
sub crl_reason_ok
{
    my $r = shift;

    if ($r eq 'unspecified' || $r eq 'keyCompromise'
        || $r eq 'CACompromise' || $r eq 'affiliationChanged'
        || $r eq 'superseded' || $r eq 'cessationOfOperation'
        || $r eq 'certificateHold' || $r eq 'removeFromCRL') {
        return 1;
    }
    print STDERR "Invalid CRL reason; must be one of:\n";
    print STDERR "    unspecified, keyCompromise, CACompromise,\n";
    print STDERR "    affiliationChanged, superseded, cessationOfOperation\n";
    print STDERR "    certificateHold, removeFromCRL";
    exit 1;
}

# Copy a PEM-format file; return like exit status (zero means ok)
sub copy_pemfile
{
    my ($infile, $outfile, $bound) = @_;
    my $found = 0;

    open IN, $infile || die "Cannot open $infile, $!";
    open OUT, ">$outfile" || die "Cannot write to $outfile, $!";
    while (<IN>) {
        $found = 1 if /^-----BEGIN.*$bound/;
        print OUT $_ if $found;
        $found = 2, last if /^-----END.*$bound/;
    }
    close IN;
    close OUT;
    return $found == 2 ? 0 : 1;
}

# Wrapper around system; useful for debugging.  Returns just the exit status
sub run
{
    my $cmd = shift;
    print "====\n$cmd\n" if $verbose;
    my $status = system($cmd);
    print "==> $status\n====\n" if $verbose;
    return $status >> 8;
}


if ( $WHAT =~ /^(-\?|-h|-help)$/ ) {
    print STDERR <<EOF;
Usage:
    CA.pl -newcert | -newreq | -newreq-nodes | -xsign | -sign | -signCA | -signcert | -crl | -newca [-extra-cmd parameter]
    CA.pl -pkcs12 [certname]
    CA.pl -verify certfile ...
    CA.pl -revoke certfile [reason]
EOF
    exit 0;
}

if ($WHAT eq '-newcert' ) {
    # create a certificate
    $RET = run("$REQ -new -x509 -keyout $NEWKEY -out $NEWCERT $DAYS"
            . " $EXTRA{req}");
    print "Cert is in $NEWCERT, private key is in $NEWKEY\n" if $RET == 0;
} elsif ($WHAT eq '-precert' ) {
    # create a pre-certificate
    $RET = run("$REQ -x509 -precert -keyout $NEWKEY -out $NEWCERT $DAYS"
            . " $EXTRA{req}");
    print "Pre-cert is in $NEWCERT, private key is in $NEWKEY\n" if $RET == 0;
} elsif ($WHAT =~ /^\-newreq(\-nodes)?$/ ) {
    # create a certificate request
    $RET = run("$REQ -new" . (defined $1 ? " $1" : "") . " -keyout $NEWKEY -out $NEWREQ $EXTRA{req}");
    print "Request is in $NEWREQ, private key is in $NEWKEY\n" if $RET == 0;
} elsif ($WHAT eq '-newca' ) {
    # create the directory hierarchy
    my @dirs = ( "${CATOP}", "${CATOP}/certs", "${CATOP}/crl",
                "${CATOP}/newcerts", "${CATOP}/private" );
    die "${CATOP}/index.txt exists.\nRemove old sub-tree to proceed,"
        if -f "${CATOP}/index.txt";
    die "${CATOP}/serial exists.\nRemove old sub-tree to proceed,"
        if -f "${CATOP}/serial";
    foreach my $d ( @dirs ) {
        if ( -d $d ) {
            warn "Directory $d exists" if -d $d;
        } else {
            mkdir $d or die "Can't mkdir $d, $!";
        }
    }

    open OUT, ">${CATOP}/index.txt";
    close OUT;
    open OUT, ">${CATOP}/crlnumber";
    print OUT "01\n";
    close OUT;
    # ask user for existing CA certificate
    print "CA certificate filename (or enter to create)\n";
    my $FILE;
    $FILE = "" unless defined($FILE = <STDIN>);
    $FILE =~ s{\R$}{};
    if ($FILE ne "") {
        copy_pemfile($FILE,"${CATOP}/private/$CAKEY", "PRIVATE");
        copy_pemfile($FILE,"${CATOP}/$CACERT", "CERTIFICATE");
    } else {
        print "Making CA certificate ...\n";
        $RET = run("$REQ -new -keyout ${CATOP}/private/$CAKEY"
                . " -out ${CATOP}/$CAREQ $EXTRA{req}");
        $RET = run("$CA -create_serial"
                . " -out ${CATOP}/$CACERT $CADAYS -batch"
                . " -keyfile ${CATOP}/private/$CAKEY -selfsign"
                . " $EXTENSIONS"
                . " -infiles ${CATOP}/$CAREQ $EXTRA{ca}") if $RET == 0;
        print "CA certificate is in ${CATOP}/$CACERT\n" if $RET == 0;
    }
} elsif ($WHAT eq '-pkcs12' ) {
    my $cname = $ARGV[0];
    $cname = "My Certificate" unless defined $cname;
    $RET = run("$PKCS12 -in $NEWCERT -inkey $NEWKEY"
            . " -certfile ${CATOP}/$CACERT -out $NEWP12"
            . " -export -name \"$cname\" $EXTRA{pkcs12}");
    print "PKCS #12 file is in $NEWP12\n" if $RET == 0;
} elsif ($WHAT eq '-xsign' ) {
    $RET = run("$CA $POLICY -infiles $NEWREQ $EXTRA{ca}");
} elsif ($WHAT eq '-sign' ) {
    $RET = run("$CA $POLICY -out $NEWCERT"
            . " -infiles $NEWREQ $EXTRA{ca}");
    print "Signed certificate is in $NEWCERT\n" if $RET == 0;
} elsif ($WHAT eq '-signCA' ) {
    $RET = run("$CA $POLICY -out $NEWCERT"
            . " $EXTENSIONS -infiles $NEWREQ $EXTRA{ca}");
    print "Signed CA certificate is in $NEWCERT\n" if $RET == 0;
} elsif ($WHAT eq '-signcert' ) {
    $RET = run("$X509 -x509toreq -in $NEWREQ -signkey $NEWREQ"
            . " -out tmp.pem $EXTRA{x509}");
    $RET = run("$CA $POLICY -out $NEWCERT"
            .  "-infiles tmp.pem $EXTRA{ca}") if $RET == 0;
    print "Signed certificate is in $NEWCERT\n" if $RET == 0;
} elsif ($WHAT eq '-verify' ) {
    my @files = @ARGV ? @ARGV : ( $NEWCERT );
    foreach my $file (@files) {
        # -CAfile quoted for VMS, since the C RTL downcases all unquoted
        # arguments to C programs
        my $status = run("$VERIFY \"-CAfile\" ${CATOP}/$CACERT $file $EXTRA{verify}");
        $RET = $status if $status != 0;
    }
} elsif ($WHAT eq '-crl' ) {
    $RET = run("$CA -gencrl -out ${CATOP}/crl/$CACRL $EXTRA{ca}");
    print "Generated CRL is in ${CATOP}/crl/$CACRL\n" if $RET == 0;
} elsif ($WHAT eq '-revoke' ) {
    my $cname = $ARGV[0];
    if (!defined $cname) {
        print "Certificate filename is required; reason optional.\n";
        exit 1;
    }
    my $reason = $ARGV[1];
    $reason = " -crl_reason $reason"
        if defined $reason && crl_reason_ok($reason);
    $RET = run("$CA -revoke \"$cname\"" . $reason . $EXTRA{ca});
} else {
    print STDERR "Unknown arg \"$WHAT\"\n";
    print STDERR "Use -help for help.\n";
    exit 1;
}

exit $RET;
